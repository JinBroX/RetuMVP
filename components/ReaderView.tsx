"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateUserId } from '@/lib/uid';
import { StoryData, StoryOption, UserProfile } from '@/types/story';

// 初始化 Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReaderView() {
  const [story, setStory] = useState<Partial<StoryData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentHexagram, setCurrentHexagram] = useState<string | null>(null);

  // 初始化用户和加载故事
  useEffect(() => {
    async function init() {
      // 1. 获取用户ID
      let uid = localStorage.getItem('zen_uid');
      if (!uid) {
        uid = generateUserId();
        localStorage.setItem('zen_uid', uid);
      }
      setUserId(uid);

      // 2. 获取用户信息 (余额等)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        } else {
          // 尝试注册/创建默认用户
           const registerRes = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid })
          });
          const registerData = await registerRes.json();
          if (registerData.user) setUserProfile(registerData.user);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }

      // 3. 检查 sessionStorage 是否有预加载的故事数据
      const storedData = sessionStorage.getItem('current_story_data');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          console.log('Loaded story from session:', data);
          setStory({
            content: data.content || data.story, // 兼容新旧API格式
            options: data.options || []
          });
          if (data.metadata && data.metadata.hexagram) {
            setCurrentHexagram(data.metadata.hexagram);
          } else if (data.hexagram_id) {
             setCurrentHexagram(data.hexagram_id);
          }
          setLoading(false);
          // 清除 session 数据，避免刷新后一直显示同一个
          sessionStorage.removeItem('current_story_data');
        } catch (e) {
          console.error('Error parsing session story data:', e);
          loadNextChapter(uid);
        }
      } else {
        // 没有预加载数据，直接加载
        loadNextChapter(uid);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载章节
  async function loadNextChapter(uid: string, hexId?: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/fetch-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid,
          hexagramId: hexId,
          seed: { ts: Date.now() } // 传入时间种子，保证每次随机结果不同
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Fetch error');
      
      setStory({
        content: data.content || data.story,
        options: data.options || []
      });
      
      if (data.metadata && data.metadata.hexagram) {
        setCurrentHexagram(data.metadata.hexagram);
      } else if (data.hexagram_id) {
        setCurrentHexagram(data.hexagram_id);
      }

      // 更新用户余额显示
      if (userProfile) {
        // 兼容 la_coin_balance
        const currentBalance = userProfile.la_coin_balance !== undefined ? userProfile.la_coin_balance : (userProfile.re_coin || 0);
        setUserProfile({ ...userProfile, la_coin_balance: Math.max(0, currentBalance - 1), re_coin: Math.max(0, currentBalance - 1) });
      }
      
    } catch (e) {
      console.error("加载失败", e);
      setStory({
        content: `连接中断... ${e instanceof Error ? e.message : ''}`,
        options: [{ text: "重试", next_chapter: 0 }]
      });
    } finally {
      setLoading(false);
    }
  }

  const handleOptionClick = () => {
    if (userId) {
      loadNextChapter(userId);
    }
  };

  // 辅助函数：根据 hexagram ID 获取显示信息
  const getHexagramInfo = (id: string) => {
    // 这里可以扩展为更完整的映射，或者从后端获取
    const map: Record<string, { symbol: string, name: string, desc: string }> = {
      'Q1': { symbol: '乾', name: '乾卦', desc: '天行健，君子以自强不息' },
      'Q2': { symbol: '坤', name: '坤卦', desc: '地势坤，君子以厚德载物' },
      // ... 更多映射
    };
    return map[id] || { symbol: '?', name: '未知', desc: '迷雾笼罩...' };
  };

  const hexInfo = currentHexagram ? getHexagramInfo(currentHexagram) : { symbol: '?', name: '...', desc: '...' };

  if (loading && !story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--cyber-bg-dark)] text-[var(--cyber-primary)]">
        <div className="animate-pulse text-xl">正在接入神经漫游网络...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 font-sans text-[var(--cyber-text)] bg-[var(--cyber-bg-dark)]"
         style={{
           backgroundImage: `
             radial-gradient(circle at 10% 20%, rgba(120, 120, 255, 0.05) 0%, transparent 20%),
             radial-gradient(circle at 90% 80%, rgba(255, 120, 255, 0.03) 0%, transparent 20%)
           `
         }}>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5">
        
        {/* 左侧侧边栏 */}
        <aside className="bg-[var(--cyber-bg-light)] border border-[var(--cyber-border)] rounded-xl p-5 h-fit sticky top-5 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
          
          {/* 玩家信息 */}
          <div className="text-center pb-5 border-b border-[var(--cyber-border)] mb-5">
            <div className="text-2xl font-bold text-[var(--cyber-primary)] mb-1">
              {userProfile?.username || '未命名行者'}
            </div>
            <div className="text-sm text-[var(--cyber-secondary)] opacity-80">
              ID: {userId?.substring(0, 8)}
            </div>
          </div>

          {/* 状态网格 */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white/5 p-2 rounded-lg border-l-4 border-[var(--cyber-primary)]">
              <div className="text-xs text-gray-400">SANITY</div>
              <div className="text-lg font-bold">100%</div>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border-l-4 border-[var(--cyber-secondary)]">
              <div className="text-xs text-gray-400">SYNC</div>
              <div className="text-lg font-bold">98%</div>
            </div>
          </div>

          {/* 货币显示 */}
          <div className="bg-gradient-to-br from-[#f9d423] to-[#ff4e50] text-black p-3 rounded-lg text-center font-bold mb-5 shadow-lg">
            RE_COIN: {userProfile?.re_coin ?? '...'}
          </div>

          {/* 卦象容器 */}
          <div className="mt-5 p-5 bg-[rgba(0,255,255,0.05)] rounded-xl border border-[rgba(0,255,255,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gua-qian)] to-[var(--gua-kun)] flex items-center justify-center text-lg font-bold text-white shadow-inner">
                {hexInfo.symbol}
              </div>
              <div className="text-xl text-[var(--cyber-primary)] font-bold">
                {hexInfo.name}
              </div>
            </div>
            <div className="italic text-gray-400 text-sm mb-2">
              {currentHexagram || 'Scanning...'}
            </div>
            <div className="bg-[rgba(255,0,255,0.1)] p-3 rounded-md border-l-2 border-[var(--cyber-secondary)] text-sm">
              {hexInfo.desc}
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="bg-[var(--cyber-bg-light)] border border-[var(--cyber-border)] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(255,0,255,0.1)] min-h-[600px] flex flex-col">
          
          {/* 顶部条 */}
          <div className="bg-gradient-to-r from-[var(--cyber-bg-dark)] to-[var(--cyber-bg-light)] p-4 border-b border-[var(--cyber-border)] flex justify-between items-center">
            <div className="font-mono text-[var(--cyber-primary)]">
              {new Date().toLocaleDateString()} <span className="animate-pulse">●</span> LIVE
            </div>
            <div className="bg-[rgba(255,215,0,0.2)] text-[#ffd700] px-3 py-1 rounded text-xs border border-[#ffd700]/30">
              CONSENSUS: ESTABLISHED
            </div>
          </div>

          {/* 故事文本 */}
          <div className="p-8 flex-grow">
            <div className="prose prose-invert max-w-none text-lg leading-loose text-[var(--cyber-text)] whitespace-pre-wrap">
              {story?.content || "信号丢失..."}
            </div>
          </div>

          {/* 选项区域 */}
          <div className="p-8 pt-0">
            <div className="grid gap-4">
              {story?.options?.map((opt: StoryOption | string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick()}
                  className="w-full text-left p-5 border border-[var(--cyber-border)] bg-[rgba(255,255,255,0.05)] hover:bg-[var(--cyber-primary)]/10 hover:border-[var(--cyber-primary)] transition-all duration-300 rounded-lg group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-[var(--cyber-primary)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-[var(--cyber-primary)] font-bold mr-3">0{index + 1}</span>
                  <span className="group-hover:text-white transition-colors">
                    {typeof opt === 'string' ? opt : opt.text}
                  </span>
                </button>
              ))}
              {(!story?.options || story.options.length === 0) && (
                <button
                  onClick={() => userId && loadNextChapter(userId)}
                  className="w-full p-4 border border-gray-700 text-center hover:bg-gray-800 rounded"
                >
                  继续探索
                </button>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
