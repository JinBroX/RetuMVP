"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SparkMemo() {
  const [category, setCategory] = useState("npc");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("idle"); // idle, saving, success

  async function saveIdea() {
    if (!content.trim()) return;
    setStatus("saving");
    
    // 我们给灵感加一个特殊的标签 [USER_IDEA]，方便 AI 识别这是精选素材
    const finalContent = `[${category.toUpperCase()}] ${content}`;
    
    const { error } = await supabase.from('assets').insert({
      hexagram_id: 'Q1', // MVP 先默认塞进 Q1 库，未来可以选卦象
      category: category, // npc, item, environment, encounter
      content: finalContent
    });

    if (error) {
      alert("录入失败: " + error.message);
      setStatus("idle");
    } else {
      setStatus("success");
      setTimeout(() => {
        setContent("");
        setStatus("idle");
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 p-6 flex flex-col">
      <h1 className="text-xl font-bold text-yellow-500 mb-6">⚡ 灵感火花 (Spark)</h1>
      
      {/* 分类选择 */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 block mb-2">灵感类型 (Category)</label>
        <div className="grid grid-cols-4 gap-2">
          {['npc', 'item', 'environment', 'encounter'].map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs p-2 rounded border ${category === cat ? 'bg-yellow-600 border-yellow-500 text-black font-bold' : 'border-gray-700 text-gray-500'}`}
            >
              {cat === 'npc' ? "BOSS/人" : cat === 'item' ? "道具" : cat === 'environment' ? "场景" : "突发"}
            </button>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="flex-1 mb-4">
        <label className="text-xs text-gray-500 block mb-2">描述 (Description)</label>
        <textarea 
          className="w-full h-64 bg-gray-900 border border-gray-700 rounded p-4 text-sm focus:border-yellow-500 focus:outline-none"
          placeholder="例如：一个叫‘断头’的机械僧侣，他守在数据塔门口，必须要回答这3个哲学问题才能通过..."
          value={content}
          onChange={e => setContent(e.target.value)}
        />
      </div>

      {/* 提交按钮 */}
      <button 
        onClick={saveIdea}
        disabled={status === 'saving'}
        className={`w-full py-4 rounded font-bold text-lg transition-all ${status === 'success' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-black'}`}
      >
        {status === 'idle' && "📥 存入素材库"}
        {status === 'saving' && "正在同步..."}
        {status === 'success' && "✅ 已保存！"}
      </button>
      
      <p className="text-center text-xs text-gray-600 mt-4">Saved to Supabase 'assets' table</p>
    </div>
  );
}
