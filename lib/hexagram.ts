// lib/hexagram.ts
import crypto from 'node:crypto';

/**
 * 核心数据结构
 */
export interface HexagramResult {
  code: number; // 状态码 200 OK
  seed: {
    timestamp: number;
    uid: string;
    ip: string;
    seedStr: string;
  };
  hexagrams: {
    main: { id: string; yaos: number[] };    // 本卦 (Q1-Q64)
    changed: { id: string; yaos: number[] }; // 变卦
    mutual: { id: string; yaos: number[] };  // 互卦
  };
}

// --- 复刻 app.js 核心算法 ---

// 1. 随机数生成器 (XORShift32)
function xorshift32(seed: number) {
  let x = seed >>> 0;
  return function() {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x >>>= 0;
    x ^= x << 5;
    x >>>= 0;
    return (x >>> 0) / 0x100000000; // float [0, 1)
  };
}

// 2. SHA-256 哈希转换
function getSeedFromHash(str: string): number {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  // 取前8位 hex 转为 Uint32
  return parseInt(hash.slice(0, 8), 16) >>> 0;
}

// 3. 生成单爻 (9=老阳, 7=少阳, 8=少阴, 6=老阴)
function randomYao(rndValue: number): number {
  if (rndValue < 0.125) return 9;           // 老阳 12.5%
  if (rndValue < 0.5) return 7;             // 少阳 37.5%
  if (rndValue < 0.875) return 8;           // 少阴 37.5%
  return 6;                                 // 老阴 12.5%
}

// 4. 爻转卦 ID (Q1..Q64)
function yaosToHexagramId(yaos: number[]): string {
  // yaos: [bottom -> top]
  let bits = 0;
  for (let i = 0; i < 6; i++) {
    const yao = yaos[i];
    const isYang = (yao === 7 || yao === 9) ? 1 : 0;
    bits |= (isYang << i);
  }
  // bits range 0..63 -> Q1..Q64
  return "Q" + (bits + 1);
}

// --- 主入口函数 ---
export function generateDailyHexagram(uid: string, ip: string = '0.0.0.0'): HexagramResult {
  // 记录生成那一刻的时间戳（天道时刻）
  const timestamp = Date.now();
  
  // 1. 核心种子: ${timestamp}@${ip}#${uid}
  const seedStr = `${timestamp}@${ip}#${uid}`;
  const seed32 = getSeedFromHash(seedStr);
  const rnd = xorshift32(seed32);

  // 2. 生成本卦六爻
  const yaos: number[] = [];
  for (let i = 0; i < 6; i++) {
    yaos.push(randomYao(rnd()));
  }

  // 3. 计算变卦 (动爻翻转: 9->8, 6->7)
  const changedYaos = yaos.map(y => {
    if (y === 9) return 8;
    if (y === 6) return 7;
    return y;
  });

  // 4. 计算互卦 (取原卦 [2,3,4] 和 [3,4,5])
  // 注意: 数组索引是 0-based，所以是 1,2,3 和 2,3,4
  const y = yaos; 
  const mutualYaos = [y[1], y[2], y[3], y[2], y[3], y[4]];

  return {
    code: 200,
    seed: { timestamp, uid, ip, seedStr },
    hexagrams: {
      main: { id: yaosToHexagramId(yaos), yaos },
      changed: { id: yaosToHexagramId(changedYaos), yaos: changedYaos },
      mutual: { id: yaosToHexagramId(mutualYaos), yaos: mutualYaos }
    }
  };
}
