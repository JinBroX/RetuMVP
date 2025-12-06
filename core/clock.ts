// lib/universe/clock.ts
import { createClient } from '@supabase/supabase-js';

// 默认配置（当无法连接数据库时使用）
const DEFAULT_CONFIG = {
  genesis_time: new Date('2024-01-01T00:00:00Z').getTime(),
  time_dilation: 12.0,
  start_year: 2077
};

interface WorldTimeState {
  retuYear: number;
  era: string;
  isDay: boolean;
  exactTime: string; // HH:mm
  dayProgress: number; // 0-1, 0 is midnight, 0.5 is noon
}

// 客户端单例
let supabaseClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    // 确保在浏览器或Edge环境中有环境变量
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

// 获取世界时间状态
export async function getUniversalState(): Promise<WorldTimeState> {
  let genesisTime = DEFAULT_CONFIG.genesis_time;
  let timeDilation = DEFAULT_CONFIG.time_dilation;
  let currentEra = "霓虹纪元";
  let eraYear = DEFAULT_CONFIG.start_year;

  // 尝试从数据库获取同步时间配置
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('world_clock')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data && !error) {
        genesisTime = new Date(data.genesis_time).getTime();
        timeDilation = data.time_dilation_factor;
        currentEra = data.current_era;
        eraYear = data.era_year;
      }
    } catch (e) {
      console.warn('Failed to fetch world clock, using defaults', e);
    }
  }

  const now = Date.now();
  const realTimePassed = now - genesisTime;
  
  // 如果时间是负数（现在时间早于创世时间），则归零
  const safeRealTimePassed = Math.max(0, realTimePassed);
  
  // 热土世界流逝的毫秒数
  const retuTimePassed = safeRealTimePassed * timeDilation;

  // 计算热土年 (365天)
  // 1天 = 24 * 60 * 60 * 1000 = 86400000 ms
  // 1年 = 365 * 86400000 = 31536000000 ms
  const ONE_DAY_MS = 86400000;
  const ONE_YEAR_MS = 31536000000;
  
  const yearsPassed = Math.floor(retuTimePassed / ONE_YEAR_MS);
  const currentYear = eraYear + yearsPassed;
  
  // 当年剩余的毫秒数
  const msInCurrentYear = retuTimePassed % ONE_YEAR_MS;
  
  // 当天的时间
  const msInCurrentDay = msInCurrentYear % ONE_DAY_MS;
  
  // 0 = 00:00, 0.5 = 12:00
  const dayProgress = msInCurrentDay / ONE_DAY_MS;
  
  // 简单的昼夜判断 (6:00 - 18:00 为白天)
  // 0.25 = 6:00, 0.75 = 18:00
  const isDay = dayProgress >= 0.25 && dayProgress < 0.75;
  
  // 格式化具体时间
  const totalMinutes = Math.floor(msInCurrentDay / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const exactTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return {
    retuYear: currentYear,
    era: currentEra,
    isDay,
    exactTime,
    dayProgress
  };
}
