"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// 配置
const MY_USER_ID = "44d8c402-a7b8-45c3-9a81-cfaddbcc21c4"; 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StoryPage() {
  const router = useRouter();
  const [storyData, setStoryData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // 1. 获取最新的一条故事
    const { data: logs } = await supabase
      .from("story_logs")
      .select("*")
      .eq("user_id", MY_USER_ID)
      .order("chapter_index", { ascending: false })
      .limit(1)
      .single();

    // 2. 获取最新属性
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", MY_USER_ID)
      .single();

    if (logs) setStoryData(logs);
    if (prof) setProfile(prof);
  }

  if (!storyData || !profile) return <div className="min-h-screen bg-black text-gray-500 flex items-center justify-center">正在读取星图...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-200 font-sans p-6 pb-20">
      {/* 顶部状态栏 */}
      <div className="fixed top-0 left-0 w-full bg-[#1a1a2e]/90 backdrop-blur p-4 flex justify-between items-center border-b border-gray-800 z-50">
        <div className="text-xl font-bold text-white">Chapter {storyData.chapter_index}</div>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-500">🪙 {profile.la_coin}</span>
          <span className="text-blue-400">⚡ {profile.attributes.stamina}</span>
        </div>
      </div>

      {/* 卦象展示 */}
      <div className="mt-20 mb-8 text-center">
        <div className="inline-block p-4 border border-gray-700 rounded-lg bg-gray-900/50">
           <div className="text-4xl mb-2 text-white font-serif">
             {/* 这里简单展示卦ID，后续可以做复杂svg画卦 */}
             {storyData.hexagram_info?.main?.id || "未知卦"}
           </div>
           <div className="text-xs text-gray-500 tracking-widest uppercase">HEXAGRAM REVEALED</div>
        </div>
      </div>

      {/* 故事正文 */}
      <article className="max-w-2xl mx-auto prose prose-invert prose-lg leading-loose text-justify">
        {storyData.content.split('\n').map((p:string, i:number) => (
          <p key={i} className="mb-4">{p}</p>
        ))}
      </article>

      {/* 底部选项 (暂时只是装饰，下一章功能再开发点击反馈) */}
      <div className="max-w-2xl mx-auto mt-12 grid gap-4">
        {storyData.options?.map((opt:string, i:number) => (
            <button 
              key={i}
              onClick={() => router.push('/')} // 暂时跳回首页重新摇
              className="w-full p-4 text-left border border-gray-600 rounded hover:bg-gray-800 hover:border-white transition-all"
            >
              <span className="text-gray-500 mr-2">{String.fromCharCode(65+i)}.</span>
              {opt}
            </button>
        ))}
      </div>
      
      {/* 返回按钮 */}
      <div className="fixed bottom-6 right-6">
        <button onClick={() => router.push('/')} className="bg-white text-black rounded-full px-6 py-3 font-bold shadow-lg hover:scale-105 transition">
          再次入定 ↺
        </button>
      </div>
    </div>
  );
}
