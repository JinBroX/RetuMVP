import { NextRequest, NextResponse } from 'next/server';

// 这个文件运行在服务端，可以安全读取 process.env
export async function POST(req: NextRequest) {
  try {
    const { messages, response_format } = await req.json();
    
    // 1. 优先用环境变量里的 Key
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "服务端未配置 DEEPSEEK_API_KEY" }, { status: 500 });
    }

    // 2. 服务端发起请求 (不暴露 Key 给前端)
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        response_format: response_format
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `DeepSeek API Error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
