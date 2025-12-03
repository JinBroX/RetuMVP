import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDailyHexagram } from '@/lib/hexagram';

// 初始化客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 简单的卦名映射兜底
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
    // 注意：这里为了配合 MVP 测试，如果摇出来的卦 database 里没有素材，
    // 我们可以临时强制把 ID 指向 'Q1' (因为刚才我们只填了 Q1 的数据)
    // 以后素材全了，就用 hexResult.hexagrams.main.id
    let hexId = hexResult.hexagrams.main.id;
    
    // --- 临时逻辑：如果摇出的不是Q1，强制切回Q1测试素材 (仅MVP阶段) ---
    // 如果你想测试真实的随机性，把下面这行删掉即可
    // hexId = 'Q1'; 
    
    const hexName = HEXAGRAM_MAP[hexId] || `卦象${hexId}`;

    // 3. 从素材库抓取原子素材 (Mixing Ingredients)
    const { data: allAssets } = await supabase
      .from('assets')
      .select('*')
      .eq('hexagram_id', hexId); // 正常逻辑：根据卦ID查

    // 辅助函数：随机抽一个
    const pickAsset = (category: string, fallback: string) => {
      if (!allAssets || allAssets.length === 0) return fallback;
      const filtered = allAssets.filter(a => a.category === category);
      if (filtered.length === 0) return fallback;
      const randomItem = filtered[Math.floor(Math.random() * filtered.length)];
      return randomItem.content;
    };

    // 抽取三个核心维度
    const envText = pickAsset('environment', '四周一片混沌，看不清景象');
    const npcText = pickAsset('npc', '一个模糊的身影在远处徘徊');
    const itemText = pickAsset('item', '一件闪烁着微光的物品');
    const encounterText = pickAsset('encounter', '突然，空气仿佛凝固了');

    // 4. 组装 Prompt
    const systemPrompt = `你是一个魔幻现实主义小说家。
请输出纯 JSON 格式，无 Markdown。
格式:
{
  "story": "300字左右的剧情，文学性强，要有画面感。",
  "options": ["A. 选项1 (动词开头)", "B. 选项2 (动词开头)"],
  "summary": "50字内剧情摘要，用于记忆"
}`;

    const userPrompt = `
【当前角色】: ${userProfile.username} 
【状态】: 体力${userProfile.attributes?.stamina || 10}, 智慧${userProfile.attributes?.wisdom || 5}
【前情提要】: ${userProfile.summary_context || "旅途刚刚开始。"}

【本章核心素材 (必须融入剧情)】:
1. [环境]: ${envText}
2. [遭遇人物/生物]: ${npcText}
3. [关键物品]: ${itemText}
4. [突发事件]: ${encounterText}

【写作要求】:
- 卦象隐喻: ${hexName}
- 请将上述素材有机串联，不要生硬堆砌。
- 结尾必须包含两难选择。
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
        temperature: 1.3, // 稍微高一点，让缝合更自然
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API Error: ${errText}`);
    }

    const aiData = await response.json();
    let contentStr = aiData.choices[0].message.content;
    
    // 清理可能存在的 markdown 符号
    contentStr = contentStr.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const aiContent = JSON.parse(contentStr);

    // 6. 存库
    await supabase.from('story_logs').insert({
      user_id: uid,
      chapter_index: (userProfile.current_chapter || 0) + 1,
      hexagram_info: hexResult.hexagrams,
      content: aiContent.story,
      options: aiContent.options
    });

    await supabase.from('profiles').update({
      la_coin: (userProfile.la_coin || 0) - 10,
      current_chapter: (userProfile.current_chapter || 0) + 1,
      summary_context: aiContent.summary
    }).eq('id', uid);

    return NextResponse.json({ 
      success: true, 
      story: aiContent.story, 
      hexagram: hexResult.hexagrams.main 
    });

  } catch (error: any) {
    console.error("Generator Error:", error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
