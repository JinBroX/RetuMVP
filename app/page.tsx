"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 请确认这里填入了您的 UID
const MY_USER_ID = "44d8c402-a7b8-45c3-9a81-cfaddbcc21c4"; 

export default function Home() {
  const router = useRouter();
  const [circles, setCircles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 初始化 6 个圆圈的颜色和位置
    const colors = [
      "bg-blue-400/60", "bg-green-400/60", "bg-red-400/60", 
      "bg-purple-400/60", "bg-orange-400/60", "bg-cyan-400/60"
    ];
    const newCircles = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      color: colors[i],
      size: Math.floor(Math.random() * 60) + 80, 
      top: Math.floor(Math.random() * 60) + 20 + "%",
      left: Math.floor(Math.random() * 80) + 10 + "%",
      animDel: Math.random() * 2 + "s"
    }));
    setCircles(newCircles);
  }, []);

  async function handleTap(circleId: number) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate-chapter", {
        method: "POST",
        body: JSON.stringify({ uid: MY_USER_ID })
      });
      if (res.ok) {
        router.push("/story"); // 成功后跳转阅读页
      } else {
        alert("天道阻塞");
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <main className="fixed inset-0 w-full h-full bg-[#704c91] overflow-hidden flex flex-col items-center justify-center font-sans">
      <h1 className="text-[15vw] md:text-[8rem] font-bold text-white/20 select-none pointer-events-none tracking-widest z-0">
        ZEN-TAP
      </h1>
      <p className="text-white/60 mt-4 z-10 text-lg tracking-widest animate-pulse">
        {loading ? "正在链接全息场..." : "点击任意光球 · 感应天道"}
      </p>
      <div className="absolute inset-0 z-20">
        {circles.map((c) => (
          <div
            key={c.id}
            onClick={() => handleTap(c.id)}
            className={`absolute rounded-full cursor-pointer backdrop-blur-sm hover:scale-110 active:scale-90 transition-all duration-300 ${c.color} ${loading ? 'opacity-0 scale-0' : 'opacity-100'}`}
            style={{
              width: c.size, height: c.size, top: c.top, left: c.left,
              animation: `breathe 3s infinite ease-in-out ${c.animDel}`
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </main>
  );
}
