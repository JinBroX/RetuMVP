"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 从环境变量获取 DeepSeek API Key
const API_KEY = process.env.DEEPSEEK_API_KEY!;

if (!API_KEY) {
  throw new Error("请在 .env.local 文件中配置 DEEPSEEK_API_KEY 环境变量");
} 

export default function AdminPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isCooking, setIsCooking] = useState(false);
  const [count, setCount] = useState(0);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  async function generateStory(index: number) {
    try {
      // 1. 【原子素材抽取】(Modular Assembly)
      // 从 18 个维度里抽 4 个核心维度
      const { data: allAssets } = await supabase.from('assets').select('*').eq('hexagram_id', 'Q1');
      if (!allAssets || allAssets.length === 0) throw new Error("Assets库为空，无法组装！");

      const pick = (cat: string) => {
        const list = allAssets.filter(a => a.category === cat);
        return list.length > 0 ? list[Math.floor(Math.random() * list.length)].content : "（数据缺失）";
      };

      const atoms = {
        env: pick('environment'),
        item: pick('item'),
        npc: pick('npc'),
        encounter: pick('encounter')
      };

      addLog(`[#${index}] 正在组装原子: ${atoms.item.substring(0,8)} + ${atoms.npc.substring(0,8)}`);

      // 2. 【DeepSeek 缝合】(Stitching)
      // 严格执行 Roadmap 里的“微观四幕结构”
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { 
              role: "system", 
              content: `你是一个硬核赛博朋克小说家。输出纯JSON。
              格式: {"story": "800字，分段。", "options": ["A...", "B..."], "summary":"...", "tags": ["Q1", "cyberpunk"]}` 
            },
            { 
              role: "user", 
              content: `
              【原子素材输入】:
              1.环境原子: ${atoms.env}
              2.道具原子: ${atoms.item}
              3.人物原子: ${atoms.npc}
              4.事件原子: ${atoms.encounter}

              【组装指令 - 微观四幕结构】:
              1. [感官入场]: 从“环境原子”切入，通过义眼或神经接口的感官（光影、臭氧味、低频噪音）来描写场景。
              2. [微观互动]: 主角在废墟中发现了“道具原子”。描写手指触摸它的金属/生物质感，以及它隐含的数据碎片。
              3. [张力爆发]: 就在此时，“事件原子”发生了。紧接着“人物原子”登场。描写压迫感和肾上腺素。
              4. [冷酷抉择]: 结尾通过对话引出两个两难选项。

              【基调】: 高科技、低生活、冷酷、乾卦的宏大与孤独。` 
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const aiData = await response.json();
      const contentObj = JSON.parse(aiData.choices[0].message.content);

      // 3. 【成品入库】(Central Kitchen)
      await supabase.from('story_pool').insert({
        hexagram_id: 'Q1',
        content: contentObj.story,
        options: contentObj.options,
        tags: contentObj.tags
      });

      addLog(`✅ [#${index}] 组装完成，已入库。字数: ${contentObj.story.length}`);
      setCount(c => c + 1);

    } catch (e: any) {
      addLog(`❌ [#${index}] 组装失败: ${e.message}`);
    }
  }

  // 批量生产控制器
  async function startBatchCooking() {
    if (!API_KEY || API_KEY.includes("粘贴")) { alert("请填写 API Key"); return; }
    setIsCooking(true);
    addLog("🏭 启动流水线，目标：10 个成品...");
    
    // 生产 10 个 (MVP 目标是 100 个，您可以多点几次)
    for (let i = 1; i <= 10; i++) {
      await generateStory(i);
      await new Promise(r => setTimeout(r, 1500)); // 间隔防止限流
    }
    setIsCooking(false);
    addLog("🏁 流水线任务结束。");
  }

  return (
    <div className="p-10 bg-black min-h-screen text-green-500 font-mono">
      <h1 className="text-2xl mb-6 border-b border-green-800 pb-2">Phase 1: Production Line</h1>
      <div className="mb-8">
        <p className="text-gray-500 mb-2">当前任务：生产 Q1 赛博朋克成品故事</p>
        <button 
          onClick={startBatchCooking} 
          disabled={isCooking}
          className="px-6 py-3 bg-green-900/50 border border-green-600 hover:bg-green-800 text-white rounded disabled:opacity-50"
        >
          {isCooking ? "SYSTEM PROCESSING..." : "EXECUTE BATCH (x10)"}
        </button>
      </div>
      <div className="border border-green-900/30 p-4 h-[600px] overflow-y-auto bg-gray-900/50 text-xs">
        {logs.map((log, i) => <div key={i} className="mb-2">{log}</div>)}
      </div>
    </div>
  );
}
