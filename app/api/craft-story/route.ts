import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, response_format } = body;
    
    // --- 👺 捉鬼行动 Start ---
    const apiKey = process.env.MY_SECRET_DS_KEY;
    console.log("========================================");
    console.log("👺 [捉鬼日志] 正在尝试读取 DEEPSEEK_API_KEY...");
    
    if (!apiKey) {
      console.error("👺 [捉鬼日志] 严重错误：读不到 Key！是 undefined");
      return NextResponse.json({ error: "服务端未配置 DEEPSEEK_API_KEY" }, { status: 500 });
    } else {
      console.log("👺 [捉鬼日志] 成功读到一个 Key，长度是:", apiKey.length);
      console.log("👺 [捉鬼日志] 这个 Key 的头是:", apiKey.slice(0, 3));
      console.log("👺 [捉鬼日志] 这个 Key 的尾是:", apiKey.slice(-4)); 
      // 如果这里打印出的尾巴是 b8c4，说明 .env.local 没生效！
    }
    console.log("========================================");
    // --- 👺 捉鬼行动 End ---

    // 发起请求
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
      console.error("👺 [DeepSeek报错]:", errText);
      return NextResponse.json({ error: `DeepSeek API Error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("👺 [服务器内部报错]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
