"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Draft {
  id: number; content: string; options: string[]; tags: string[];
  wordCount: number; status: 'raw' | 'refined' | 'uploaded'; logs: string[];
}

export default function AdminStudio() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  // 调用后端代理接口
  async function callProxyAI(prompt: string, isJSON = false) {
    const res = await fetch('/api/craft-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        response_format: isJSON ? { type: "json_object" } : undefined
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return isJSON ? JSON.parse(data.choices[0].message.content) : data.choices[0].message.content;
  }

  async function generateDeepDraft() {
    setIsWorking(true);
    const newId = Date.now();
    
    const initialDraft: Draft = {
      id: newId, content: "", options: [], tags: ['Q1', 'cyberpunk'], wordCount: 0, status: 'raw', logs: ["启动模板生成引擎..."]
    };
    setDrafts(prev => [initialDraft, ...prev]);
    const updateDraft = (partial: Partial<Draft>) => setDrafts(prev => prev.map(d => d.id === newId ? { ...d, ...partial } : d));

    try {
      // 1. 抓素材
      const { data: items } = await supabase.from('items').select('*'); // 暂时全取，或者根据 tag 过滤
      if (!items?.length) throw new Error("Supabase 物品库为空！");
      
      // 简单的分类筛选辅助函数
      const pick = (cat: string) => {
        const candidates = items.filter(i => i.category === cat);
        if (candidates.length === 0) return "（缺货）";
        const item = candidates[Math.floor(Math.random() * candidates.length)];
        return item.description || item.name;
      };

      const atoms = { 
        env: "霓虹闪烁的雨夜街头", // 暂时硬编码环境，后续可从 locations 表获取
        item: pick('item'), 
        npc: pick('npc'), // 注意：items表里可能没有npc分类，需要从npcs表取
        encounter: "遭遇了一次意外的盘查" 
      };
      
      let fullStory = "";
      
      // 2. 定义模板约束 Prompt
      const templateRules = `
      【核心规则 - 必须使用变量占位符】
      请写一个通用故事模板。不要使用具体人名或地名，必须使用以下代码替代：
      - 主角 -> {{USERNAME}}
      - 盟友NPC -> {{NPC_NAME}}
      - 敌对势力 -> {{ENEMY_FACTION}}
      - 当前地点 -> {{LOCATION}}
      - 货币单位 -> {{CURRENCY}}
      
      范例："{{USERNAME}} 把 {{CURRENCY}} 递给了 {{NPC_NAME}}。"
      `;

      // Part 1
      updateDraft({ logs: ["生成: 环境入场模板..."] });
      const res1 = await callProxyAI(`${templateRules}\n素材:${atoms.env}。写一段250字开场模板。`);
      fullStory += res1 + "\n\n";
      updateDraft({ content: fullStory, wordCount: fullStory.length });

      // Part 2
      updateDraft({ logs: ["生成: 互动模板..."] });
      const res2 = await callProxyAI(`${templateRules}\n前文:${res1.substring(res1.length-50)} 素材:${atoms.item}。写250字互动模板。`);
      fullStory += res2 + "\n\n";
      updateDraft({ content: fullStory, wordCount: fullStory.length });

      // Part 3
      updateDraft({ logs: ["生成: 冲突模板..."] });
      const res3 = await callProxyAI(`${templateRules}\n前文:${res2.substring(res2.length-50)} 素材:${atoms.npc}和${atoms.encounter}。写300字冲突模板。`);
      fullStory += res3 + "\n\n";
      updateDraft({ content: fullStory, wordCount: fullStory.length });
  
      // Part 4
      updateDraft({ logs: ["生成: 结局选项..."] });
      const resOpt = await callProxyAI(`剧情:${fullStory.substring(fullStory.length-200)}。生成2个选项JSON {"options":[]}`, true);
      
      updateDraft({ 
        content: fullStory, options: resOpt.options, wordCount: fullStory.length, 
        status: 'refined', logs: ["✅ 模板生成完毕"] 
      });

    } catch (e: any) {
      updateDraft({ logs: [`❌ 错误: ${e.message}`] });
    } finally {
      setIsWorking(false);
    }
  }

  async function uploadDraft(id: number) {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    const res = await supabase.from('story_pool').insert({
      hexagram_id: 'Q1', content: draft.content, options: draft.options, tags: draft.tags
    });
    if (!res.error) setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'uploaded' } : d));
    else alert(res.error.message);
  }

  // --- UI 部分不变，为了简洁省略非核心UI代码，请保留您原有的return部分，或者直接复制下面这个简版 ---
  return (
    <div className="bg-black min-h-screen text-green-500 p-8 font-mono">
      <header className="border-b border-green-800 pb-4 mb-8 flex justify-between">
        <h1 className="text-2xl">Admin Studio (Template Mode)</h1>
        <button onClick={generateDeepDraft} disabled={isWorking} className="bg-green-900 border border-green-600 px-4 py-2 text-white">
          {isWorking ? "生产中..." : "新建模板 (Template)"}
        </button>
      </header>
      <div className="grid gap-4">
        {drafts.map(draft => (
          <div key={draft.id} className="border border-green-900 p-4 rounded bg-gray-900/50">
            <div className="flex justify-between mb-2 text-xs text-gray-400">
              <span>ID: {draft.id} | {draft.status}</span>
               {draft.status !== 'uploaded' && <button onClick={() => uploadDraft(draft.id)} className="text-green-400 border border-green-800 px-2">☁️ 上架库房</button>}
            </div>
            <textarea readOnly className="w-full h-32 bg-black border border-gray-800 p-2 text-xs text-gray-300" value={draft.content} />
          </div>
        ))}
      </div>
    </div>
  );
}
