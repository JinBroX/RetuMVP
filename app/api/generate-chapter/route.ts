import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 只有数据库查询，可以用 Edge，速度飞快
export const runtime = 'edge'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uid = body.uid;

    // 1. 获取用户信息
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!userProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. 确定卦象 (MVP 锁定 Q1)
    const hexId = 'Q1'; 

    // 3. 【核心差异】直接从成品库(story_pool) 捞一个现成的！
    // 逻辑：找一个 Q1 的，随机拿一条
    // 进阶逻辑：最好找那些 id 和当前时间戳取模匹配的，实现伪随机
    const { data: stories } = await supabase
      .from('story_pool')
      .select('*')
      .eq('hexagram_id', hexId);

    let selectedStory;

    if (!stories || stories.length === 0) {
      // --- 兜底机制：如果成品库是空的，返回一个默认模版 ---
      selectedStory = {
        content: "（系统提示：中央厨房暂时缺货，请运行预烘焙脚本。）\n\n天行健，君子以自强不息。你行走在旷野之上...",
        options: ["A. 继续探索", "B. 原地休整"]
      };
    } else {
      // 随机抽一个
      selectedStory = stories[Math.floor(Math.random() * stories.length)];
    }

    // 4. 动态变量注入 (微波炉加热)
    // 把模版里的 {{username}} 换成真名
    let finalContent = selectedStory.content.replace(/{{username}}/g, userProfile.username || '流浪者');
    
    // 5. 存入阅读记录 (story_logs)
    await supabase.from('story_logs').insert({
      user_id: uid,
      chapter_index: (userProfile.current_chapter || 0) + 1,
      hexagram_info: { main: { id: hexId } },
      content: finalContent,
      options: selectedStory.options
    });

    // 6. 扣费更新
    await supabase.from('profiles').update({
      re_coin: (userProfile.re_coin || 0) - 10, // 注意：这里用 re_coin
      current_chapter: (userProfile.current_chapter || 0) + 1,
    }).eq('id', uid);

    return NextResponse.json({ success: true, story: finalContent });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
