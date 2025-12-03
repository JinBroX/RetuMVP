import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyHexagram } from '@/lib/hexagram';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HEXAGRAM_MAP: Record<string, string> = { "Q1": "乾卦" };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // 1. 强制锁定 Q1 (上帝模式)
    let hexId = 'Q1'; 
    const hexName = "乾为天";

    // 2. 获取素材
    const { data: allAssets } = await supabase
      .from('assets')
      .select('*')
      .eq('hexagram_id', hexId);

    const pickAsset = (cat: string, def: string) => {
      // 如果没连上素材库，就用默认值
      if (!allAssets || allAssets.length === 0) return def;
      const list = allAssets.filter(a => a.category === cat);
      return list.length > 0 ? list[Math.floor(Math.random() * list.length)].content : def;
    };

    // 随机取素材
    const env = pickAsset('environment', '混沌虚空');
    const npc = pickAsset('npc', '神秘人');
    const item = pickAsset('item', '发光碎片');
    const evt = pickAsset('encounter', '异象突生');

    // 3. DeepSeek Prompt
    const systemPrompt = `你是一个小说家。输出纯JSON: {"story":"...", "options":["A...","B..."], "summary":"..."}`;
    const userPrompt = `
    角色: 玩家
    卦象: ${hexName}
    强制素材: ${env}, ${npc}, ${item}, ${evt}
    要求: 300字剧情，两难选择。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(await response.text());
    const aiData = await response.json();
    const content = JSON.parse(aiData.choices[0].message.content);

    // 4. 写入数据库 (关键!)
    const { error } = await supabase.from('story_logs').insert({
      user_id: body.uid,
      chapter_index: 1, // 暂时写死，保证一定能查到
      hexagram_info: { main: { id: "Q1" } }, 
      content: content.story,
      options: content.options
    });
    
    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Error:", error); // 去 Vercel Logs 看这个报错
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
