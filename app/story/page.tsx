"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// --- 配置 ---
const MY_USER_ID = "你的_USER_UID_粘贴在这里"; // ⚠️ 记得检查这里！
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
    // 并行拉取：最新故事 + 用户当前属性
    const fetchData = async () => {
      try {
        const [logRes, profRes] = await Promise.all([
          supabase
            .from("story_logs")
            .select("*")
            .eq("user_id", MY_USER_ID)
            .order("chapter_index", { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from("profiles")
            .select("*")
            .eq("id", MY_USER_ID)
            .single()
        ]);

        if (logRes.data) setStoryData(logRes.data);
        if (profRes.data) setProfile(profRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 处理选项点击
  const handleChoice = async (optionText: string) => {
    // 这里未来可以加逻辑：比如记录用户的选择偏好
    // 目前 MVP 逻辑：选完后，跳回首页，准备摇下一支卦
    router.push("/"); 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-gray-500 tracking-widest animate-pulse">
        <div className="text-2xl mb-4">❖</div>
        <div>正在解析天道...</div>
      </div>
    );
  }

  if (!storyData || !profile) return <div className="p-10 text-white">数据读取失败，请刷新。</div>;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-300 font-sans selection:bg-yellow-900 selection:text-white">
      
      {/* 1. 顶部 HUD (状态栏) */}
      <header className="fixed top-0 left-0 w-full bg-[#0a0a12]/90 backdrop-blur-md border-b border-white/5 z-50 px-6 py-4 flex justify-between items-center">
        <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
          Chapter {storyData.chapter_index}
        </div>
        
        {/* 属性展示区 */}
        <div className="flex gap-6 text-sm font-mono">
          <div className="flex items-center gap-2 text-yellow-500">
            <span>🪙</span> 
            <span>{profile.la_coin}</span>
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <span>⚡</span> 
            <span>{profile.attributes?.stamina ?? 10}</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <span>🧠</span> 
            <span>{profile.attributes?.wisdom ?? 5}</span>
          </div>
        </div>
      </header>

      {/* 2. 主内容区 */}
      <main className="max-w-2xl mx-auto px-6 pt-32 pb-40">
        
        {/* 卦象图腾 (Q1 乾卦特供版) */}
        <div className="flex flex-col items-center mb-12 opacity-80">
          {/* 乾卦符号：六个阳爻 */}
          <div className="flex flex-col gap-1 mb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-16 h-1 bg-yellow-600/80 rounded-full shadow-[0_0_10px_rgba(202,138,4,0.5)]"></div>
            ))}
          </div>
          <h1 className="text-2xl font-serif text-yellow-100/90 tracking-widest">
            {storyData.hexagram_info?.main?.id || "乾为天"}
          </h1>
          <div className="text-[10px] text-gray-600 mt-2 tracking-[0.3em] uppercase">
            The Creative
          </div>
        </div>

        {/* 故事正文 (沉浸阅读样式) */}
        <article className="prose prose-invert prose-lg leading-loose text-gray-300 font-serif text-justify">
          {storyData.content?.split('\n').map((paragraph: string, idx: number) => (
            paragraph.trim() && (
              <p key={idx} className="mb-6 first-letter:text-3xl first-letter:font-bold first-letter:text-yellow-600 first-letter:mr-1">
                {paragraph}
              </p>
            )
          ))}
        </article>
      </main>

      {/* 3. 底部选项区 (固定在底部) */}
      <footer className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#0a0a12] via-[#0a0a12] to-transparent pb-8 pt-12 px-6 z-40">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {storyData.options?.map((option: string, index: number) => (
            <button
              key={index}
              onClick={() => handleChoice(option)}
              className="group relative w-full p-4 text-left border border-white/10 bg-white/5 rounded-lg hover:bg-white/10 hover:border-yellow-500/50 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs text-gray-400 group-hover:border-yellow-500 group-hover:text-yellow-500 transition-colors">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-gray-200 group-hover:text-white font-medium">
                  {option}
                </span>
              </div>
              {/* 装饰光效 */}
              <div className="absolute inset-0 rounded-lg bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          ))}
        </div>
      </footer>

    </div>
  );
}
