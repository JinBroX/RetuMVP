"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ⚠️ 必须填入您的 DeepSeek Key 才能工作（测试完请删除或用环境变量保护）
const API_KEY = "sk-a73d560276654bbfa82427201910dcbe"; 

export default function AdminPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isCooking, setIsCooking] = useState(false);
  const [count, setCount] = useState(0); // 计数器

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // --- 单次生产函数 ---
  async function generateStory(index: number) {
    try {
      // 1. 抓素材
      const { data: allAssets } = await supabase.from('assets').select('*').eq('hexagram_id', 'Q1');
      if (!allAssets || allAssets.length === 0) throw new Error("Assets表为空！");

      const pick = (cat: string) => {
        const list = allAssets.filter(a => a.category === cat);
        return list.length > 0 ? list[Math.floor(Math.random() * list.length)].content : "无";
      };

      const ingredients = {
        env: pick('environment'),
        item: pick('item'),
        npc: pick('npc'),
        encounter: pick('encounter')
      };

      addLog(`[#${index}] 正在缝合: ${ingredients.item.substring(0, 5)}... + ${ingredients.npc.substring(0, 5)}...`);

      // 2. 调 AI
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { 
              role: "system", 
              content: `你是一个硬核魔幻现实主义小说家。输出纯JSON。格式: {"story": "800字左右，分四幕，感官描写丰富", "options": ["A...", "B..."], "summary":"..."}` 
            },
            { 
              role: "user", 
              content: `强制素材:\n1.环境:${ingredients.env}\n2.道具:${ingredients.item}\n3.NPC:${ingredients.npc}\n4.突发:${ingredients.encounter}\n\n要求：将上述素材有机串联，体现乾卦“刚健、高远”的基调。不要堆砌，要像电影镜头一样推拉。结尾给出两难抉择。` 
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const aiData = await response.json();
      const contentObj = JSON.parse(aiData.choices[0].message.content);

      // 3. 存库
      await supabase.from('story_pool').insert({
        hexagram_id: 'Q1',
        content: contentObj.story,
        options: contentObj.options,
        tags: ['generated', 'batch_01']
      });

      addLog(`✅ [#${index}] 生产成功！字数: ${contentObj.story.length}`);
      setCount(c => c + 1);

    } catch (e: any) {
      addLog(`❌ [#${index}] 失败: ${e.message}`);
    }
  }

  // --- 批量主控函数 ---
  async function startBatchCooking() {
    if (!API_KEY || API_KEY.includes("粘贴")) {
      alert("请先在代码里填入 DeepSeek API Key！");
      return;
    }
    
    setIsCooking(true);
    addLog("🚀 启动批量生产流水线 (目标: 5 条)...");

    // 循环执行 5 次 (串行执行，防止 API Rate Limit)
    for (let i = 1; i <= 5; i++) {
      await generateStory(i);
      // 稍微休息 2 秒，更稳
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    addLog("🏁 批量任务结束！请去数据库查收。");
    setIsCooking(false);
  }

  return (
    <div className="p-10 bg-gray-900 min-h-screen text-green-400 font-mono">
      <h1 className="text-3xl mb-6 border-b border-green-800 pb-4">热土工场 · 中央厨房</h1>
      
      <div className="flex gap-8 mb-8">
        <div className="bg-black p-4 rounded border border-green-800">
          <div className="text-gray-500 text-sm">当前库存 (Q1)</div>
          <div className="text-4xl font-bold text-white">{count} <span className="text-sm text-green-600">new</span></div>
        </div>
        
        <button 
          onClick={startBatchCooking} 
          disabled={isCooking}
          className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded shadow-[0_0_20px_rgba(21,128,61,0.5)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {isCooking ? "🔥 正在全速生产中..." : "Start Batch (生产 5 条)"}
        </button>
      </div>

      <div className="bg-black rounded border border-green-900 h-[500px] overflow-y-auto p-4 font-mono text-sm shadow-inner">
        {logs.map((log, i) => (
          <div key={i} className={`mb-2 border-b border-green-900/30 pb-1 ${log.includes("❌") ? "text-red-400" : "text-green-400"}`}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <span className="text-gray-600 opacity-50">系统就绪，等待指令...</span>}
      </div>
    </div>
  );
}
