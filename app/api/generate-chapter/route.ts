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
    const systemPrompt = `你是一个硬核魔幻现实主义小说家，擅长“厚涂法”描写。
请输出纯 JSON 格式，无 Markdown。
格式要求:
{
  "story": "长度必须在 800-1000 字之间。必须使用‘五感描写法’（视觉、听觉、嗅觉、触觉）。",
  "options": ["A. 选项1", "B. 选项2"],
  "summary": "50字内摘要"
}`;

    // 我们在 Prompt 里教 AI 如何“缝合”
    const userPrompt = `
【当前角色】: 玩家 
【状态】: 体力充沛
【强制素材】: 
1. 环境: ${env}
2. 遭遇: ${npc}
3. 物品: ${item}
4. 突发: ${evt}

【写作指令 - 请严格按以下四步扩写】:

第一步：环境与五感入场 (200字)
- 不要直接写环境素材，要通过主角的感官来发现它。
- 描写空气的味道、皮肤的触感、耳边的底噪。
- 将"${env}"扩写为这种感官体验。

第二步：探索与微观互动 (250字)
- 主角在行进中发现了"${item}"。
- 必须描写主角拾取或观察它时的动作细节（手指的触感、物品的重量、甚至物品上的纹路）。
- 在这个空隙中，加入主角内心的独白或对前路的不安。

第三步：遭遇与张力爆发 (300字)
- 就在主角沉浸时，"${evt}"发生了。
- 紧接着，"${npc}"登场。
- 描写这个瞬间的压迫感、主角的生理反应（心跳、冷汗、肌肉紧绷）。

第四步：对话与抉择 (150字)
- NPC 说出了一句晦涩的话（结合乾卦“天行健”的隐喻）。
- 给出两难的结局。

【整体基调】: 乾卦（刚健、高远、冷酷）。
`;

// ... 后面代码不变 ...

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
