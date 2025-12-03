"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- 配置区域 ---
// TODO: 在内测阶段，为了跳过登录页，我们要把 User UID 硬编码在这里
// 请把刚才复制的 UID 填在引号里！
const MY_USER_ID = "44d8c402-a7b8-45c3-9a81-cfaddbcc21c4"; 
const API_URL = "/api/generate-chapter";

// --- 初始化 Supabase (前端模式) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  // 状态管理
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<string>("");
  const [hexagram, setHexagram] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // 1. 加载用户数据
  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, []);

  async function fetchProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", MY_USER_ID).single();
    if (data) {
        setProfile(data);
        // 如果还没开始第一章，显示初始背景
        if (data.current_chapter === 0) setStory(data.summary_context); 
    }
  }

  async function fetchHistory() {
    const { data } = await supabase.from("story_logs").select("*").eq("user_id", MY_USER_ID).order("chapter_index", { ascending: false });
    if (data) setLogs(data);
  }

  // 2. Zen-Tap 摇卦核心动作
  async function handleZenTap() {
    if (loading) return;
    if (profile.la_coin < 10) {
      alert("腊币不足！请充值 (MVP暂未开放)");
      return;
    }

    setLoading(true);
    try {
      // 调用我们在后端写好的 API
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: MY_USER_ID }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setStory(data.story);     // 更新当前故事
        setHexagram(data.hexagram); // 更新卦象显示
        fetchProfile();           // 刷新属性(扣钱了)
        fetchHistory();           // 刷新历史记录
      } else {
        alert("生成失败: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  }

  // --- 界面渲染 ---
  return (
    <main className="min-h-screen bg-black text-gray-200 font-sans flex flex-col items-center p-4">
      {/* 顶部状态栏 */}
      <header className="w-full max-w-md flex justify-between items-center py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-widest">RETU 热土</h1>
        <div className="flex gap-4 text-sm">
          <div className="text-yellow-500">🪙 {profile?.la_coin || 0}</div>
          <div className="text-blue-400">⚡ {profile?.attributes?.stamina || 0}</div>
          <div className="text-purple-400">🔮 {profile?.attributes?.wisdom || 0}</div>
        </div>
      </header>

      {/* 核心互动区：Zen-Tap */}
      <div className="my-10 flex flex-col items-center justify-center">
        <div 
          onClick={handleZenTap}
          className={`
            relative w-48 h-48 rounded-full flex items-center justify-center cursor-pointer transition-all duration-700
            ${loading ? "scale-90 opacity-50" : "hover:scale-105 active:scale-95"}
            bg-gradient-to-b from-gray-900 to-black border border-gray-700 shadow-[0_0_50px_rgba(255,255,255,0.1)]
          `}
        >
          {/* 呼吸光效 */}
          <div className="absolute inset-0 rounded-full animate-pulse border border-gray-600 opacity-30"></div>
          
          {loading ? (
            <span className="text-xs animate-bounce">感应天道...</span>
          ) : (
            <div className="text-center">
              {hexagram ? (
                <>
                  <div className="text-4xl mb-2">{/* 这里可以放卦象符号 */}☷</div>
                  <div className="text-lg font-bold text-white">{hexagram.id}</div>
                </>
              ) : (
                <span className="text-gray-500 text-sm tracking-widest">点击感应</span>
              )}
            </div>
          )}
        </div>
        
        {/* 卦象结果展示 */}
        {hexagram && !loading && (
          <div className="mt-6 text-center animate-fade-in">
             <p className="text-xs text-gray-500">本卦</p>
             <h2 className="text-2xl font-serif text-white mt-1">待解之卦</h2>
          </div>
        )}
      </div>

      {/* 故事阅读器 */}
      <section className="w-full max-w-md bg-gray-900/50 p-6 rounded-xl border border-gray-800 mb-20">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">
          Chapter {profile?.current_chapter || 0}
        </h3>
        
        <div className="prose prose-invert leading-relaxed text-gray-300">
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 bg-gray-800 rounded w-3/4 animate-pulse"></div>
              <div className="h-2 bg-gray-800 rounded w-full animate-pulse"></div>
              <div className="h-2 bg-gray-800 rounded w-5/6 animate-pulse"></div>
            </div>
          ) : (
            story.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)
          )}
        </div>
      </section>
      
    </main>
  );
}
