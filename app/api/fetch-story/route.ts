import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUniversalState } from '@/core/clock';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 开发模式标志：如果为 true，将跳过扣费和数据库写入
const DEV_MODE_SKIP_DB = false;

// 辅助函数：生成长篇叙事
function generateDetailedNarrative(
  location: any, 
  parentLocation: any, 
  npcs: any[], 
  timeState: any, 
  user: any
): string {
  const { retuYear, era, exactTime, isDay } = timeState;
  const timeDesc = isDay ? "白昼" : "深夜";
  const weather = isDay ? "充满辐射尘的阴霾天空" : "被霓虹灯光染色的低垂夜幕";
  
  // 1. 开篇：时空定位 (约300字)
  let narrative = `
    【时间记录】 ${era} ${retuYear}年 | ${exactTime} (${timeDesc})
    【当前位置】 ${parentLocation ? parentLocation.name + ' - ' : ''}${location.name}
    
    你的意识刚刚接入这片区域。
    ${weather}笼罩着大地，空气中弥漫着${location.pollution_level > 50 ? '刺鼻的化学烟雾' : '陈旧的机油味'}。
    这里是${location.name}，${location.description || '一个被遗忘的角落'}。
    
    ${parentLocation ? `这就坐落在${parentLocation.name}的腹地。${parentLocation.description || ''}` : ''}
    四周的环境显得${isDay ? '格外嘈杂，全息广告牌在灰暗的天空中争奇斗艳' : '有些诡异的寂静，只有远处机械运转的低鸣声'}。
    脚下的地面${location.biome === '未知' ? '由不知名的合成金属铺就' : `呈现出${location.biome}特有的质感`}，隐约反射着周围的光怪陆离。
  `;

  // 2. 环境细节与感官描写 (约500字)
  narrative += `
    
    你环顾四周，试图捕捉更多细节。
    在这个${timeDesc}，${location.name}展现出了它独特的一面。墙壁上斑驳的涂鸦似乎在诉说着过去的故事，那是关于${era}早期的记忆。
    全息投影在空气中闪烁，投射出断断续续的新闻片段和通缉令。
    
    远处，巨大的散热风扇在缓缓转动，切割着停滞的空气。你可以听到远处传来的警笛声，那是${location.owner_faction_id === 'cpc' ? 'CPC巡逻队' : '某个帮派火拼'}留下的余韵。
    街道两旁堆积着废弃的电子元件，像是一座座微型的金属坟墓。偶尔有几只经过改造的老鼠窜过，眼睛闪烁着红色的电子光芒。
    
    你的视网膜显示屏上跳动着环境参数：
    - 辐射指数: ${location.pollution_level || '未知'} Sv/h
    - 危险等级: ${location.detail_level > 1 ? '高危' : '中等'}
    - 网络连接: ${location.is_virtual ? '极佳 (直接脑后插管)' : '不稳定 (物理层干扰)'}
  `;

  // 3. NPC 登场与动态 (约600字)
  if (npcs && npcs.length > 0) {
    narrative += `
    
    在这片混乱与秩序交织的空间里，你并不是唯一的访客。
    `;
    
    npcs.forEach(npc => {
      narrative += `
      
      不远处，你注意到了${npc.name}。
      ${npc.role ? `身份标识显示为：[${npc.role}]。` : ''}
      ${npc.avatar_url ? `(检测到义体外观数据...) ` : ''}
      
      ${npc.name}看起来${npc.personality || '有些难以捉摸'}。
      ${npc.backstory ? `据传闻，${npc.backstory}` : ''}
      此刻，${npc.name}正${npc.function_desc ? `在${npc.function_desc}` : '警惕地注视着周围'}。
      ${npc.dialogue_style ? `从那独特的${npc.dialogue_style}气质中，你能感觉到这是一个有故事的人。` : ''}
      `;
    });
    
    // 交互预设
    const mainNpc = npcs[0];
    narrative += `
    
    ${mainNpc.name}似乎察觉到了你的目光，微微侧过头。
    空气中仿佛凝固了一瞬间的紧张感。在热土世界，每一次眼神接触都可能意味着交易，或者冲突。
    `;
  } else {
    narrative += `
    
    四周空无一人。这种孤独感在热土世界是罕见的奢侈，也是危险的信号。
    你只能听到自己的呼吸声，以及义体运作时轻微的电流声。
    或许，这里的人都躲藏在阴影之中，窥视着你这个不速之客。
    `;
  }

  // 4. 冲突与抉择 (约400字)
  narrative += `
    
    突然，你的通讯频道收到了一条加密广播，或者是某种直觉的警示。
    在这个${location.location_type === 'room' ? '狭小的房间' : '开阔的区域'}里，某种并未明说的暗流正在涌动。
    你必须做出决定。是为了探索真相而冒险深入，还是为了生存而保持距离？
    
    在这个被${era}遗弃或重塑的${location.name}，每一个选择都会在你的“命盘”上刻下痕迹。
    你的${user.la_coin_balance !== undefined ? `账户余额 (${user.la_coin_balance} Ⓡ)` : '信用点数'}在这个瞬间也许能派上用场，也许毫无意义。
    
    命运的齿轮开始转动。
  `;

  return narrative.trim(); // 去除首尾空白，但保留段落间的换行
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
    } catch (err: any) {
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

    } catch (err: any) {
      console.error('Story generation failed:', err);
      storyData = {
        id: `fallback_${Date.now()}`,
        hexagram_id: hexId,
        title: '信号丢失',
        content: '正如你所见，这个区域的数据流出现了严重的湍流。我们暂时无法解析出清晰的现实画面。',
        options: [{ text: '重试连接', next_chapter: 0 }]
      };
    }

    // 5. 变量替换 (Legacy support)
    let finalContent = storyData.content;
    finalContent = finalContent.replace(/{username}/g, userProfile.username || '旅行者');

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

  } catch (err: any) {
    console.error('API Fatal Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
