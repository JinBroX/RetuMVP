// app/api/generate-chapter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyHexagram } from '@/lib/hexagram';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HEXAGRAM_MAP: Record<string, string> = {
  "Q1": "乾卦", "Q2": "坤卦", 
  // DeepSeek 会自动补全剩下的意象
};

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!userProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hexResult = generateDailyHexagram(uid, ip);
    const mainHexId = hexResult.hexagrams.main.id;
    const hexName = HEXAGRAM_MAP[mainHexId] || `卦象${mainHexId}`;

    const systemPrompt = `你是一个基于易经卦象的魔幻现实主义小说家。
    请输出纯 JSON 格式，不要包含 markdown 代码块。
    格式:
    {
      "story": "200字左右的紧凑剧情",
      "options": ["A. 选项1", "B. 选项2"],
      "summary": "50字内的剧情摘要"
    }`;

    const userPrompt = `
    角色: ${userProfile.username}
    状态: 体力${userProfile.attributes.stamina}, 智慧${userProfile.attributes.wisdom}
    前情: ${userProfile.summary_context || "冒险开始。"}
    
    今日卦象: 【${hexName}】
    要求: 将此卦象的哲学含义（如潜龙勿用）隐喻地写进故事。
    `;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 1.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`DeepSeek API Error: ${errorData}`);
    }

    const aiData = await response.json();
    const contentStr = aiData.choices[0].message.content;
    const aiContent = JSON.parse(contentStr);

    await supabase.from('story_logs').insert({
      user_id: uid,
      chapter_index: userProfile.current_chapter + 1,
      hexagram_info: hexResult.hexagrams,
      content: aiContent.story,
      options: aiContent.options
    });

    await supabase.from('profiles').update({
      la_coin: userProfile.la_coin - 10,
      current_chapter: userProfile.current_chapter + 1,
      summary_context: aiContent.summary
    }).eq('id', uid);

    return NextResponse.json({ 
      success: true, 
      story: aiContent.story, 
      hexagram: hexResult.hexagrams.main 
    });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
