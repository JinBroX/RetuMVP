import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyHexagram } from '@/lib/hexagram';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HEXAGRAM_MAP: Record<string, string> = {
  "Q1": "乾卦", "Q2": "坤卦", 
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uid = body.uid;
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. 校验用户
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. 核心算法摇卦
    const hexResult = generateDailyHexagram(uid, ip);
    
    // =========== 【MVP 内测特供修改】Start ===========
    // 原本逻辑：let hexId = hexResult.hexagrams.main.id;
    // 强制逻辑：无论算出来是什么，现在统统变成 Q1，方便测试素材库
    let hexId = 'Q1'; 
    // =========== 【MVP 内测特供修改】End =============
    
    const hexName = HEXAGRAM_MAP[hexId] || `卦象${hexId}`;

    // 3. 从素材库抓取
    const { data: allAssets } = await supabase
      .from('assets')
      .select('*')
      .eq('hexagram_id', hexId);

    const pickAsset = (category: string, fallback: string) => {
      if (!allAssets || allAssets.length === 0) return fallback;
      const filtered = allAssets.filter(a => a.category === category);
      if (filtered.length === 0) return fallback;
      const randomItem = filtered[Math.floor(Math.random() * filtered.length)];
      return randomItem.content;
    };

    // 随机抽取三件套
    const envText = pickAsset('environment', '四周一片混沌');
    const npcText = pickAsset('npc', '一个模糊的身影');
    const itemText = pickAsset('item', '一件发光的物品');
    const encounterText = pickAsset('encounter', '空气突然凝固');

    // 4. 构造 Prompt
    const systemPrompt = `你是一个魔幻现实主义小说家。
请输出纯 JSON 格式，无 Markdown。
格式:
{
  "story": "300字左右的剧情，文学性强。",
  "options": ["A. (动词)", "B. (动词)"],
  "summary": "50字内剧情摘要"
}`;

    const userPrompt = `
【当前角色】: ${userProfile.username} 
【状态】: 体力${userProfile.attributes?.stamina || 10}
【前情提要】: ${userProfile.summary_context || "旅途开始。"}

【强制植入素材】:
1. 环境: ${envText}
2. 遭遇: ${npcText}
3. 物品: ${itemText}
4. 事件: ${encounterText}

【要求】:
- 结合卦象: ${hexName}
- 将上述素材自然融合，不要堆砌。
- 结尾给出两难选择。
`;

    // 5. 调用 DeepSeek
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

    if (!response.ok) throw new Error(await response.text());

    const aiData = await response.json();
    let contentStr = aiData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiContent = JSON.parse(contentStr);

    // 6. 存库
    await supabase.from('story_logs').insert({
      user_id: uid,
      chapter_index: (userProfile.current_chapter || 0) + 1,
      hexagram_info: hexResult.hexagrams, // 存真实的卦象数据，虽然故事是按Q1写的
      content: aiContent.story,
      options: aiContent.options
    });

    await supabase.from('profiles').update({
      la_coin: (userProfile.la_coin || 0) - 10,
      current_chapter: (userProfile.current_chapter || 0) + 1,
      summary_context: aiContent.summary
    }).eq('id', uid);

    return NextResponse.json({ success: true, story: aiContent.story });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
