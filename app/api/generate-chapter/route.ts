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

    // 2. 核心算法摇卦 (内测阶段强制锁定 Q1)
    // const hexResult = generateDailyHexagram(uid, ip);
    // let hexId = hexResult.hexagrams.main.id;
    
    // =========== 【MVP 内测特供】锁定乾卦 ===========
    const hexResult = generateDailyHexagram(uid, ip); // 还是跑一下算法生成结构
    let hexId = 'Q1'; 
    // =============================================
    
    const hexName = HEXAGRAM_MAP[hexId] || `卦象${hexId}`;

    // 3. 获取素材
    const { data: allAssets } = await supabase
      .from('assets')
      .select('*')
      .eq('hexagram_id', hexId);

    const pickAsset = (category: string, def: string) => {
      if (!allAssets || allAssets.length === 0) return def;
      const list = allAssets.filter(a => a.category === category);
      return list.length > 0 ? list[Math.floor(Math.random() * list.length)].content : def;
    };

    const envText = pickAsset('environment', '一片混沌的虚空');
    const npcText = pickAsset('npc', '一个模糊的影子');
    const itemText = pickAsset('item', '一件未知的物品');
    const encounterText = pickAsset('encounter', '空气突然凝固');

    // 4. 准备变量 (解决 TS 报错)
    const username = userProfile.username || "流浪者";
    const stamina = (userProfile.attributes as any)?.stamina ?? 10;
    const context = userProfile.summary_context || "旅途刚刚开始。";

    // 5. 构造 Prompt (Director Prompt)
    const systemPrompt = `你是一个硬核魔幻现实主义小说家，擅长“厚涂法”描写。
请输出纯 JSON 格式，无 Markdown。
格式要求:
{
  "story": "长度必须在 800-1000 字之间。必须使用‘五感描写法’（视觉、听觉、嗅觉、触觉）。分段落，不要写成一大坨。",
  "options": ["A. 选项1", "B. 选项2"],
  "summary": "50字内摘要"
}`;

    const userPrompt = `
【当前角色】: ${username} 
【状态】: 体力${stamina}
【前情提要】: ${context}

【强制素材】: 
1. 环境: ${envText}
2. 遭遇: ${npcText}
3. 物品: ${itemText}
4. 突发: ${encounterText}

【写作指令 - 请严格按以下四步扩写，确保字数充足】:

第一步：环境与五感入场 (约200字)
- 不要直接写环境素材，要通过主角的感官来发现它。
- 描写空气的味道、皮肤的触感、耳边的底噪。
- 将"${envText}"扩写为这种沉浸式体验。

第二步：探索与微观互动 (约250字)
- 主角在行进中发现了"${itemText}"。
- 必须描写主角拾取或观察它时的动作细节（手指的触感、物品的重量、纹路）。
- 在这个空隙中，加入主角内心的独白，联系前情提要。

第三步：遭遇与张力爆发 (约300字)
- 就在主角沉浸时，"${encounterText}"发生了。
- 紧接着，"${npcText}"登场。
- 描写这个瞬间的压迫感、主角的生理反应（心跳、冷汗、肌肉紧绷）。

第四步：对话与抉择 (约150字)
- NPC 说出了一句晦涩的话（结合乾卦“天行健”或“潜龙”的隐喻）。
- 给出两难的结局。

【整体基调】: 乾卦（刚健、高远、冷酷）。
`;

    // 6. 调用 DeepSeek
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

    // 7. 存库
    await supabase.from('story_logs').insert({
      user_id: uid,
      chapter_index: (userProfile.current_chapter || 0) + 1,
      hexagram_info: hexResult.hexagrams,
      content: aiContent.story,
      options: aiContent.options
    });

    await supabase.from('profiles').update({
      re_coin: (userProfile.re_coin || 0) - 10,
      current_chapter: (userProfile.current_chapter || 0) + 1,
      summary_context: aiContent.summary
    }).eq('id', uid);

    return NextResponse.json({ 
      success: true, 
      story: aiContent.story 
    });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
