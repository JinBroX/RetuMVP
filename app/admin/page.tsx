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

  // 修改：不再直接调 DeepSeek，而是调我们自己的代理接口
  async function callProxyAI(prompt: string, isJSON = false) {
    const res = await fetch('/api/admin/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        response_format: isJSON ? { type: "json_object" } : undefined
      })
    });
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    const content = data.choices[0].message.content;
    return isJSON ? JSON.parse(content) : content;
  }

  async function generateDeepDraft() {
    setIsWorking(true);
    const newId = Date.now();
    
    // 初始化 UI
    const initialDraft: Draft = {
      id: newId, content: "", options: [], tags: ['Q1', 'cyberpunk'], wordCount: 0, status: 'raw', logs: ["启动分段生成引擎..."]
    };
    setDrafts(prev => [initialDraft, ...prev]);

    const updateDraft = (partial: Partial<Draft>) => {
      setDrafts(prev => prev.map(d => d.id === newId ? { ...d, ...partial } : d));
    };

    try {
      // 1. 抓素材
      const { data: assets } = await supabase.from('assets').select('*').eq('hexagram_id', 'Q1');
      if (!assets?.length) throw new Error("Assets 表为空！");
      
      const pick = (cat: string) => assets.filter(a => a.category === cat)[Math.floor(Math.random() * assets.filter(a => a.category === cat).length)]?.content || "缺失";
      const atoms = { env: pick('environment'), item: pick('item'), npc: pick('npc'), encounter: pick('encounter') };
      
      let fullStory = "";
      
      // 2. 分段生成 (通过代理接口)
      // Part 1
      updateDraft({ logs: ["正在生成: 环境入场..."] });
      const res1 = await callProxyAI(`你是一赛博朋克作家。素材: ${atoms.env}。写一段250字的开场环境描写。`);
      fullStory += res1 + "\n\n";
      updateDraft({ content: fullStory, wordCount: fullStory.length });

      // Part 2
      updateDraft({ logs: ["正在生成: 微观互动..."] });
      const res2 = await callProxyAI(`前文:${res1.substring(res1.length-50)} 素材:${atoms.item}。写250字主角发现并观察物品的细节。`);
      fullStory += res2 + "\n\n";
      updateDraft({ content: fullStory, wordCount: fullStory.length });

      // Part 3
      updateDraft({ logs: ["正在生成: 张力爆发..."] });
      const res3 = await callProxyAI(`前文:${res2.substring(res2.length-50)} 素材:${atoms.npc}和${atoms.encounter}。写300字冲突爆发。`);
      fullStory += res3 + "\n\n";
      updateDraft({ content: fullStory, wordCount: fullStory.length });
  
      // Part 4
      updateDraft({ logs: ["正在生成: 结局选项..."] });
      const resOpt = await callProxyAI(`剧情:${fullStory.substring(fullStory.length-200)}。生成2个两难选项JSON {"options":[]}`, true);
      
      updateDraft({ 
        content: fullStory, options: resOpt.options, wordCount: fullStory.length, 
        status: 'refined', logs: ["✅ 生成完毕"] 
      });

    } catch (e: any) {
      updateDraft({ logs: [`❌ 错误: ${e.message}`] });
    } finally {
      setIsWorking(false);
    }
  }

  async function refineDraft(id: number, instruction: string) {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    setIsWorking(true);
    try {
      const newContent = await callProxyAI(`原文:${draft.content} 指令:${instruction} 要求:直接输出修改后文章`);
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, content: newContent, wordCount: newContent.length } : d));
    } catch (e: any) { alert(e.message); } finally { setIsWorking(false); }
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

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-gray-300 font-sans p-8">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-cyan-400">热土内容编辑部 (Team Version)</h1>
        <button 
          onClick={generateDeepDraft} disabled={isWorking}
          className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6 py-2 rounded disabled:opacity-50"
        >
          {isWorking ? "生产中..." : "🚀 新建长篇草稿"}
        </button>
      </header>

      <div className="grid gap-6">
        {drafts.map(draft => (
          <div key={draft.id} className={`border rounded-lg p-6 ${draft.status === 'uploaded' ? 'border-green-800 opacity-60' : 'border-gray-700'}`}>
            <div className="flex justify-between mb-4">
               <span className="text-xs font-mono text-gray-500">ID: {draft.id} | 字数: {draft.wordCount}</span>
               <div className="flex gap-2">
                 <button onClick={() => refineDraft(draft.id, "扩写第二段")} className="text-xs border border-gray-600 px-2 rounded">🛠️ 扩写</button>
                 {draft.status !== 'uploaded' && <button onClick={() => uploadDraft(draft.id)} className="text-xs bg-green-700 text-white px-3 rounded">☁️ 上架</button>}
               </div>
            </div>
            <textarea 
              className="w-full h-48 bg-black/50 border border-gray-800 p-2 text-sm"
              value={draft.content} onChange={(e) => setDrafts(prev => prev.map(d => d.id === draft.id ? {...d, content: e.target.value} : d))}
            />
            <div className="text-[10px] text-gray-500 mt-2">{draft.logs.join(" > ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
