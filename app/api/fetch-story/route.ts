import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUniversalState } from '@/core/clock';
import { Location, NPC, TimeState, UserProfile } from '@/types/story';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 开发模式标志：如果为 true，将跳过扣费和数据库写入
// 自动检测开发模式，避免本地环境数据库连接问题
const DEV_MODE_SKIP_DB = process.env.NODE_ENV === 'development' || false;

// 辅助函数：生成长篇叙事
function generateDetailedNarrative(
  location: Location, 
  parentLocation: Location | null, 
  npcs: NPC[], 
  timeState: TimeState, 
  user: UserProfile
): string {
  const { retuYear, era, exactTime, isDay } = timeState;
  const timeDesc = isDay ? "白昼" : "深夜";
  const weather = isDay ? "充满辐射尘的阴霾天空" : "被霓虹灯光染色的低垂夜幕";
  const factionName = location.owner_faction_id ? location.owner_faction_id.toUpperCase() : '未知势力';
  
  // 随机细节生成器
  const microEvents = [
    "一只机械义眼在阴沟里闪烁着红光，似乎还在录制着什么。",
    "头顶的无人机群像苍蝇一样嗡嗡作响，投射出巨大的全息广告：'黑螺生化，重塑你的灵魂'。",
    "远处传来一声沉闷的爆炸声，地面微微震动，但周围的人群似乎早已习以为常。",
    "空气中飘来一阵合成蛋白烧焦的味道，混合着廉价香水的刺鼻气息。",
    "你的神经接口突然收到一条乱码信息，随即又迅速消失在数据洪流中。"
  ];
  const randomEvent = microEvents[Math.floor(Math.random() * microEvents.length)];

  const philosophyQuotes = [
    "“在这个时代，肉体是枷锁，而数据是唯一的解脱。”",
    "“记住，所有的记忆都是可编辑的，包括你以为的‘真实’。”",
    "“秩序只是暴力的另一种形式，而混乱才是宇宙的熵增本质。”",
    "“我们都在废墟上跳舞，假装明天还有希望。”"
  ];
  const randomQuote = philosophyQuotes[Math.floor(Math.random() * philosophyQuotes.length)];

  // 1. 开篇：时空定位与宏观视角 (约500字)
  let narrative = `
    【系统日志】 时间同步完成... 纪元：${era} | 年份：${retuYear} | 当前时刻：${exactTime} (${timeDesc})
    【定位数据】 扇区：${parentLocation ? parentLocation.name : '未知区域'} > 节点：${location.name}
    【环境监测】 辐射值：${location.pollution_level || Math.floor(Math.random() * 100)} Sv/h | 现实稳定度：${location.is_virtual ? '波动 (虚拟层)' : '稳定 (物理层)'}
    
    ----------------------------------------------------------------------------------
    
    你的意识随着传输协议的完成而猛然下坠，重重地砸进了${location.name}的现实之中。
    
    ${weather}像一块沉重的铅板压在头顶，让人感到窒息。这里是${location.name}，${location.description || '一个被遗忘在时间洪流中的角落'}。从宏观视角俯瞰，${parentLocation ? `这里仅仅是${parentLocation.name}庞大结构中的一个微不足道的节点，但对于身处其中的蝼蚁而言，这便是整个世界。` : '这里仿佛是世界的尽头，文明的残渣在这里堆积发酵。'}
    
    ${isDay ? '苍白的阳光艰难地穿透厚重的雾霾，洒下斑驳而病态的光影。全息广告牌在白昼下显得有些黯淡，但依然不知疲倦地闪烁着，争夺着每一个路人的注意力。' : '夜幕降临，霓虹灯的光芒接管了一切。紫红色的光污染将天空染成了淤血般的颜色，巨大的全息舞女在楼宇间扭动，仿佛在嘲笑着地面的肮脏与混乱。'}
    
    脚下的地面${location.biome === '未知' ? '由不知名的合成金属铺就，表面覆盖着一层油腻的污垢' : `呈现出${location.biome}特有的质感，每一步都能感受到岁月留下的痕迹`}。这里充斥着${factionName}的痕迹——墙壁上喷涂着巨大的帮派标志，监控探头像秃鹫一样注视着每一个角落，空气中弥漫着${location.pollution_level > 50 ? '刺鼻的化学烟雾和焦臭味' : '陈旧的机油味和霉味'}。
  `;

  // 2. 环境细节与感官沉浸 (约600字)
  narrative += `
    
    你深吸一口气，过滤面罩发出轻微的嘶嘶声，试图将那些有害物质阻挡在外。
    环顾四周，${location.name}展现出了它那令人着迷又作呕的细节。
    
    左侧的建筑物墙皮脱落，露出了里面生锈的钢筋和不断渗漏的管道。那些管道像是一条条裸露的血管，搏动着不知名的液体。墙角堆积着废弃的电子元件：破碎的VR眼镜、断裂的义肢、烧焦的电路板……它们像是一座座微型的金属坟墓，埋葬着旧时代的辉煌与梦想。偶尔有几只经过改造的老鼠窜过，它们的眼睛被替换成了红色的LED灯，在阴影中划出一道道诡异的光轨。
    
    听觉传感器里充斥着混乱的噪音：远处巨大的散热风扇在轰鸣，切割着停滞的空气；不知何处传来的警笛声，那是${location.owner_faction_id === 'cpc' ? 'CPC巡逻队正在执行“清理”任务' : '某个帮派火拼留下的余韵'}；还有路边流浪汉的低声呓语，夹杂着电流干扰的滋滋声。这些声音交织在一起，构成了一曲赛博朋克时代的末日交响乐。
    
    ${randomEvent}
    
    你的视网膜显示屏上，不断跳动着各种环境参数警告。
    “警告：检测到违禁神经信号。”
    “提示：您的${user.la_coin_balance !== undefined ? `账户余额 (${user.la_coin_balance} Ⓡ)` : '信用点数'}可能不足以支付该区域的‘安全税’。”
    这些红色的弹窗在你的视野边缘闪烁，提醒着你在这个弱肉强食的世界里，生存是唯一的法则。
    
    远处，全息投影投射出断断续续的新闻片段：“……${era} ${retuYear}年，${factionName}宣布对该区域实施新的管制措施……违者将被强制格式化……” 声音失真严重，听起来像是一个垂死之人的喘息。
  `;

  // 3. NPC 交互与动态叙事 (约800字)
  if (npcs && npcs.length > 0) {
    narrative += `
    
    在这片混乱与秩序交织的空间里，生命的迹象虽然稀薄，但依然顽强。
    你并不是唯一的访客。
    `;
    
    npcs.forEach(npc => {
      narrative += `
      
      不远处，一个身影引起了你的注意——${npc.name}。
      ${npc.role ? `扫描结果显示，其身份标识为：[${npc.role}]。` : '身份不明。'}
      ${npc.avatar_url ? `(系统正在下载其义体外观数据... 完成。)` : ''}
      
      ${npc.name}看起来${npc.personality || '有些难以捉摸'}，浑身散发着一种危险的气息。${npc.backstory ? `据数据库中的碎片信息记载，${npc.backstory}` : '关于这个人的过去，数据库里只有一片空白，或者是被刻意抹去的黑洞。'}
      此刻，${npc.name}正${npc.function_desc ? `在${npc.function_desc}` : '警惕地注视着周围，手似乎有意无意地搭在腰间的武器上'}。
      
      ${npc.dialogue_style ? `从那独特的${npc.dialogue_style}气质中，你能感觉到这是一个有故事的人。也许，他/她手里掌握着你需要的情报，或者是终结你生命的子弹。` : ''}
      `;
    });
    
    // 交互预设
    const mainNpc = npcs[0];
    narrative += `
    
    ${mainNpc.name}似乎察觉到了你的目光，微微侧过头，电子义眼旋转聚焦，锁定了你的位置。
    空气中仿佛凝固了一瞬间的紧张感。在热土世界，每一次眼神接触都可能意味着交易的开始，或者冲突的爆发。
    
    你感觉到自己的心跳微微加速，肾上腺素泵开始运作。
    是走上前去，试图从${mainNpc.name}口中套取关于“${randomQuote}”的线索？
    还是保持距离，观察局势的变化？
    `;
  } else {
    narrative += `
    
    四周空无一人。
    这种彻底的孤独感在拥挤的热土世界是罕见的奢侈，更是一个危险的信号。
    通常，这意味着这里要么是某个大人物的私人领地，要么是某种不可名状的恐怖刚刚经过。
    
    你只能听到自己的呼吸声，以及体内义体运作时轻微的电流声。
    或许，这里的人都躲藏在阴影之中，窥视着你这个不速之客。
    或许，你已经踏入了一个陷阱，猎人正通过瞄准镜观察着你的每一个动作。
    
    墙上的一行涂鸦引起了你的注意：${randomQuote}
    这行字迹潦草而疯狂，似乎是某个绝望者在临死前留下的最后遗言。
    `;
  }

  // 4. 冲突预警与抉择时刻 (约500字)
  narrative += `
    
    突然，你的通讯频道收到了一条加密广播，或者是某种直觉的警示。
    信号虽然微弱，但足以让你警觉。
    
    在这个${location.location_type === 'room' ? '狭小而压抑的房间' : '开阔却充满危机的区域'}里，某种并未明说的暗流正在涌动。
    风向变了。
    原本${isDay ? '喧闹' : '死寂'}的街道似乎发生了一些微妙的变化。
    远处的阴影里，似乎有人影在晃动。
    
    系统提示：【检测到因果律波动】
    
    你必须立刻做出决定。
    是为了探索那个所谓的真相而冒险深入，哪怕前方是万劫不复的数据深渊？
    还是为了生存而保持距离，像一个明智的懦夫一样苟且偷生？
    
    在这个被${era}遗弃或重塑的${location.name}，每一个选择都会在你的“命盘”上刻下不可逆转的痕迹。
    你的每一个念头，都可能引发蝴蝶效应，最终导致整个区域的崩塌或重生。
    
    命运的齿轮已经开始转动，发出刺耳的摩擦声。
    下一步，怎么走？
  `;

  return narrative.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid } = body;
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. 获取用户资料
    let userProfile;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (!data && !error) {
        // 用户不存在，创建新用户
        const { data: createdUser, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: uid,
            username: `旅行者_${uid.substring(0, 6)}`,
            la_coin_balance: 100 // 初始赠送
          }])
          .select()
          .single();
          
        if (createError) throw createError;
        userProfile = createdUser;
      } else if (error) {
        throw error;
      } else {
        userProfile = data;
      }
    } catch (err: unknown) {
      console.error('User profile error:', err);
      return NextResponse.json({ error: 'User profile error' }, { status: 500 });
    }

    // 2. 确定卦象 (Seed Logic)
    const hexagramOptions = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15', 'Q16', 'Q17', 'Q18', 'Q19', 'Q20'];
    let hexId = body.hexagramId;
    
    if (!hexId) {
      const seedData = body.seed;
      if (seedData && seedData.x !== undefined && seedData.y !== undefined && seedData.ts) {
        const seedStr = `${uid}-${seedData.ts}-${seedData.x}-${seedData.y}`;
        let hash = 5381;
        for (let i = 0; i < seedStr.length; i++) {
          hash = ((hash << 5) + hash) + seedStr.charCodeAt(i);
        }
        const index = Math.abs(hash) % hexagramOptions.length;
        hexId = hexagramOptions[index];
      } else {
        hexId = hexagramOptions[Math.floor(Math.random() * hexagramOptions.length)];
      }
    }

    // 3. 获取世界时间状态 (New!)
    const timeState = await getUniversalState();

    // 4. 获取丰富的上下文数据 (Granular Fetching)
    let storyData;
    try {
      // 4.1 获取当前地点
      const { data: locationData } = await supabase
        .from('locations')
        .select('*')
        .eq('hexagram_id', hexId)
        .single();
        
      if (!locationData) throw new Error('Location not found');

      // 4.2 获取父级地点 (Hierarchy)
      let parentLocationData = null;
      if (locationData.parent_id) {
        const { data: pData } = await supabase
          .from('locations')
          .select('*')
          .eq('hexagram_id', locationData.parent_id)
          .single();
        parentLocationData = pData;
      }

      // 4.3 获取该地点的所有 NPC (More NPCs)
      const { data: npcList } = await supabase
        .from('npcs')
        .select('*')
        .eq('current_location_id', hexId);

      // 4.4 生成长篇故事 (2000+ words equivalent logic)
      const detailedContent = generateDetailedNarrative(
        locationData,
        parentLocationData,
        npcList || [],
        timeState,
        userProfile
      );

      storyData = {
        id: `story_${Date.now()}`,
        hexagram_id: hexId,
        title: `${timeState.era} • ${locationData.name}`,
        content: detailedContent,
        options: [
          { text: '深入探索', next_chapter: 1, action: 'explore' },
          { text: '与之交流', next_chapter: 1, action: 'talk' },
          { text: '快速撤离', next_chapter: 1, action: 'leave' }
        ]
      };

    } catch (err: unknown) {
      console.error('Story generation failed:', err);
      storyData = {
        id: `fallback_${Date.now()}`,
        hexagram_id: hexId,
        title: '信号丢失',
        content: '正如你所见，这个区域的数据流出现了严重的湍流。我们暂时无法解析出清晰的现实画面。',
        options: [{ text: '重试连接', next_chapter: 0 }]
      };
    }

    // 5. 变量替换 (Legacy support) - Removed unused variable
    // finalContent logic was unused as it wasn't returned

    // 6. 扣费与记录 (Non-blocking)
    if (!DEV_MODE_SKIP_DB) {
      // 异步执行，不等待
      (async () => {
        try {
          await supabase.from('story_logs').insert([{
            user_id: uid,
            story_id: storyData.id,
            hexagram_id: storyData.hexagram_id,
            story_title: storyData.title,
            story_content: storyData.content
          }]);
          
          // 简单的扣费逻辑
          if ((userProfile.la_coin_balance || 0) > 0) {
            await supabase.from('profiles')
              .update({ la_coin_balance: (userProfile.la_coin_balance || 0) - 1 })
              .eq('id', uid);
          }
        } catch (e) {
          console.error('Background task error:', e);
        }
      })();
    }

    return NextResponse.json(storyData);

  } catch (err: unknown) {
    console.error('API Fatal Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
