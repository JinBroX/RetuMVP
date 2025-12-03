"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const MY_USER_ID = "你的_USER_UID_粘贴在这里"; // ⚠️ 必须确认这个ID和数据库里的一样

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StoryPage() {
  const router = useRouter();
  const [storyData, setStoryData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // 1. 查 Profile
      let { data: prof } = await supabase.from("profiles").select("*").eq("id", MY_USER_ID).single();
      setProfile(prof);

      // 2. 查 Story (容错处理)
      let { data: logs } = await supabase
        .from("story_logs")
        .select("*")
        .eq("user_id", MY_USER_ID)
        .order("created_at", { ascending: false }) // 按时间倒序最稳
        .limit(1)
        .maybeSingle(); // 用 maybeSingle 不会报错

      setStoryData(logs);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="p-10 text-white">正在读取星图...</div>;

  // ⚡ 如果没查到数据，显示这一块，而不是白屏
  if (!storyData) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p>暂无历史记录，请先摇卦</p>
      <button onClick={() => router.push('/')} className="border px-4 py-2 rounded">回首页</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300 font-sans p-6 pb-32">
      <header className="fixed top-0 left-0 w-full bg-[#0a0a12]/90 backdrop-blur border-b border-white/10 p-4 flex justify-between z-50">
        <div className="text-xs font-bold tracking-widest uppercase">Chapter {storyData.chapter_index}</div>
        <div className="flex gap-4 text-sm">
          {/* Re Coin 修改 */}
          <div className="flex items-center gap-2 text-yellow-500">
            <span className="font-bold text-[10px] border border-yellow-500/50 rounded px-1">RE</span>
            <span>{profile?.re_coin || 0}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-20">
        <h1 className="text-center text-2xl font-serif text-yellow-100 mb-8">乾为天</h1>
        <article className="prose prose-invert prose-lg text-justify font-serif">
          {storyData.content?.split('\n').map((p:string, i:number) => <p key={i}>{p}</p>)}
        </article>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-2xl mx-auto grid gap-3">
          {storyData.options?.map((opt:string, i:number) => (
            <button key={i} onClick={() => router.push('/')} className="w-full p-4 bg-white/10 border border-white/20 rounded hover:bg-white/20 transition text-left">
              <span className="text-yellow-500 mr-2">{String.fromCharCode(65+i)}.</span> {opt}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
