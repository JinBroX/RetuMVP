// app/api/generate-chapter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateDailyHexagram } from '@/lib/hexagram';

// 1. 初始化 Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 简单卦名映射
const HEXAGRAM_MAP: Record<string, string> = {
  "Q1": "乾卦 (天行健，自强不息)", 
  "Q2": "坤卦 (地势坤，厚德载物)",
  // 如果遇到没定义的，代码会自动处理
};

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // A.读取用户数据
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!userProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    
    // 暂时注释掉腊币检查，方便您测试
    // if (userProfile.la_coin < 10) return NextResponse.json({ error: 'La Coin 不足' }, { status: 403 });

    // B. 摇卦算法
    const hexResult = generateDailyHexagram(uid, ip);
    const mainHexId = hexResult.hexagrams.main.id;
    const hexName = HEXAGRAM_MAP[mainHexId] || `卦象ID: ${mainHexId}`;

    // C. 构造 Prompt
    const prompt = `
    你是一个专业的TRPG游戏主持人和小说家。请根据以下信息生成故事的下一章。
    
    【角色信息】
    - 姓名: ${userProfile.username}
    - 状态: 体力 ${userProfile.attributes.stamina}, 智慧 ${userProfile.attributes.wisdom}
    - 前情提要: ${userProfile.summary_context || "冒险刚刚开始。"}
    
    【今日随机事件/运势】
    - 卦象: ${hexName}
    - 卦意要求: 请将此卦象的哲理（如险阻、通达、变革）隐喻地融入剧情中。

    【生成要求】
    1. 剧情长度约 200 字。
    2. 结尾必须给出 2 个明确的行动选项（A 和 B）。
    3. **必须只返回纯 JSON 格式**，不要包含 markdown 标记（如 \`\`\`json ），格式如下：
    {
      "story": "这里是故事正文...",
      "options": ["A. 选项一内容", "B. 选项二内容"],
      "summary": "这里是供AI记忆的新摘要(50字内)"
    }
    `;

    // D. 调用 Gemini Flash 模型
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // 处理 Gemini 返回的文本 (去掉可能存在的 markdown 格式符号)
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const aiContent = JSON.parse(text);

    // E. 存入数据库
    // 1. 记录故事
    await supabase.from('story_logs').insert({
      user_id: uid,
      chapter_index: userProfile.current_chapter + 1,
      hexagram_info: hexResult.hexagrams,
      content: aiContent.story,
      options: aiContent.options
    });

    // 2. 更新用户状态 (扣费 + 更新摘要 + 章节+1)
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
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
