"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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
    // 并行加载数据
    Promise.all([
      supabase.from("story_logs").select("*").eq("user_id", MY_USER_ID).order("chapter_index", { ascending: false }).limit(1).single(),
      supabase.from("profiles").select("*").eq("id", MY_USER_ID).single()
    ]).then(([logRes, profRes]) => {
      if (logRes.data) setStoryData(logRes.data);
      if (profRes.data) setProfile(profRes.data);
    });
  }, []);

  if (!storyData || !profile) return <div className="min-h-screen bg-[#0a0a1a] text-gray-500 flex items-center justify-center">正在读取星图...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-200 font-sans p-6 pb-20">
      <div className="fixed top-0 left-0 w-full bg-[#1a1a2e]/90 backdrop-blur p-4 flex justify-between items-center border-b border-gray-800 z-50">
        <div className="text-xl font-bold text-white">第 {storyData.chapter_index} 回</div>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-500">🪙 {profile.la_coin}</span>
        </div>
      </div>
      <div className="mt-24 mb-8 text-center">
        <div className="inline-block p-4 text-4xl text-white font-serif border border-gray-700 rounded bg-gray-900/50">
             {storyData.hexagram_info?.main?.id || "卦"}
        </div>
      </div>
      <article className="max-w-2xl mx-auto prose prose-invert text-lg leading-loose text-justify">
        {storyData.content?.split('\n').map((p:string, i:number) => <p key={i} className="mb-4">{p}</p>)}
      </article>
      <div className="fixed bottom-6 right-6">
        <button onClick={() => router.push('/')} className="bg-white text-black rounded-full px-6 py-3 font-bold shadow-lg hover:scale-105 transition">再次入定 ↺</button>
      </div>
    </div>
  );
}
