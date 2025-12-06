"use client";
import { useRouter } from "next/navigation"; 
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfileView() {
  const router = useRouter(); 
  const [user, setUser] = useState<User | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('avatar_name').eq('id', user.id).single();
        if (data) setAvatarName(data.avatar_name || "");
      }
      setLoading(false);
    }
    loadData();
  }, []);

   async function saveName() {
    if (!user) return;
    setMsg("保存中...");
    
    const { error } = await supabase.from('profiles').update({
      avatar_name: avatarName
    }).eq('id', user.id);

    if (!error) {
      setMsg("✅ 身份已更新，正在进入热土...");
      
      // 【新增逻辑】1秒后跳回首页 (/) 或者 剧场页 (/theater)
      // 您根据需要改成 router.push('/theater');
      setTimeout(() => {
        router.push('/'); 
      }, 1000);
      
    } else {
      setMsg("❌ 失败: " + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 p-6 flex flex-col items-center pt-20">
      {/* 极简的头像占位 */}
      <div className="w-20 h-20 bg-gray-800 rounded-full mb-8 flex items-center justify-center text-2xl">
        {avatarName ? avatarName[0] : "无"}
      </div>

      <h1 className="text-xl font-light tracking-widest mb-8 text-gray-400">身份档案</h1>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label className="text-xs text-gray-600 uppercase block mb-2">宇宙分身名 (Avatar Name)</label>
          <input
            type="text"
            value={avatarName}
            onChange={(e) => setAvatarName(e.target.value)}
            placeholder="行者"
            className="w-full bg-transparent border-b border-gray-700 py-2 text-xl text-white focus:border-white focus:outline-none transition-colors text-center"
          />
          <p className="text-xs text-gray-600 mt-2 text-center">这是您在热土宇宙中的唯一称呼，将用于所有历史记录。</p>
        </div>

        <div className="pt-8">
          <button 
            onClick={saveName}
            className="w-full bg-gray-100 text-black py-3 rounded font-medium hover:bg-gray-300 transition-colors"
          >
            确认身份
          </button>
          <p className="text-center text-sm text-gray-500 mt-4 min-h-[20px]">{msg}</p>
        </div>
      </div>
    </div>
  );
}
