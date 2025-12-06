import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, response_format } = body;
    
    // --- 👺 捉鬼行动 Start ---
    // 尝试多种环境变量名称，兼容Vercel和本地开发
    const apiKey = process.env.MY_SECRET_DS_KEY || process.env.DEEPSEEK_API_KEY;
    console.log("========================================");
    console.log("👺 [捉鬼日志] 正在尝试读取API Key...");
    console.log("👺 [捉鬼日志] 环境检查: NODE_ENV =", process.env.NODE_ENV);
    
    if (!apiKey) {
      console.error("👺 [捉鬼日志] 严重错误：读不到 Key！");
      console.error("👺 [捉鬼日志] 检查的环境变量: MY_SECRET_DS_KEY, DEEPSEEK_API_KEY");
      return NextResponse.json({ error: "服务端未配置API Key" }, { status: 500 });
    } else {
      console.log("👺 [捉鬼日志] 成功读到一个 Key，长度是:", apiKey.length);
      console.log("👺 [捉鬼日志] 这个 Key 的头是:", apiKey.slice(0, 3));
      console.log("👺 [捉鬼日志] 这个 Key 的尾是:", apiKey.slice(-4)); 
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

  } catch (error: unknown) {
    console.error("👺 [服务器内部报错]:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
