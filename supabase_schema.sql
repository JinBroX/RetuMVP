-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 核心规则表 (Core Rules)
CREATE TABLE IF NOT EXISTS core_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL,
  currency_name TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  origin_event TEXT,
  ultimate_crisis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 派系表 (Factions)
CREATE TABLE IF NOT EXISTS factions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  description TEXT,
  sub_units TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 地理/场景表 (Locations/Geography)
CREATE TABLE IF NOT EXISTS locations (
  hexagram_id TEXT PRIMARY KEY,
  trigram TEXT,
  name TEXT NOT NULL,
  description TEXT,
  owner_faction_id TEXT REFERENCES factions(id),
  biome TEXT DEFAULT '未知',
  pollution_level INTEGER DEFAULT 0,
  is_virtual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. NPC 名单表 (NPC Roster)
CREATE TABLE IF NOT EXISTS npcs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  faction_id TEXT REFERENCES factions(id),
  personality TEXT,
  function_desc TEXT,
  is_legendary BOOLEAN DEFAULT TRUE,
  current_location_id TEXT REFERENCES locations(hexagram_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 物品/技术表 (Items/Tech)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  effect_data JSONB,
  price_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 玩家档案扩展表 (Profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT,
  faction_id TEXT REFERENCES factions(id),
  bio TEXT,
  la_coin_balance INTEGER DEFAULT 0,
  current_location_id TEXT REFERENCES locations(hexagram_id),
  attributes JSONB,
  inventory JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 故事日志表 (Story Logs)
CREATE TABLE IF NOT EXISTS story_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  story_id TEXT,
  hexagram_id TEXT,
  story_title TEXT,
  story_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 变量表 (Variables) - 用于文本替换
CREATE TABLE IF NOT EXISTS variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hexagram_id TEXT REFERENCES locations(hexagram_id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 世界时钟表 (World Clock) - 保证所有玩家时间线同步
CREATE TABLE IF NOT EXISTS world_clock (
  id INTEGER PRIMARY KEY DEFAULT 1, -- 单例表，只存一行
  genesis_time TIMESTAMP WITH TIME ZONE DEFAULT '2024-01-01 00:00:00+00',
  time_dilation_factor FLOAT DEFAULT 12.0, -- 时间流速倍率
  current_era TEXT DEFAULT '霓虹纪元',
  era_year INTEGER DEFAULT 2077,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认时钟配置
INSERT INTO world_clock (id, genesis_time, time_dilation_factor, current_era, era_year)
VALUES (1, '2024-01-01 00:00:00+00', 12.0, '霓虹纪元', 2077)
ON CONFLICT (id) DO NOTHING;

-- 修改 Locations 表以支持层级结构 (父子关系)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES locations(hexagram_id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'region'; -- region, zone, building, room
ALTER TABLE locations ADD COLUMN IF NOT EXISTS detail_level INTEGER DEFAULT 1; -- 1: Macro, 2: Meso, 3: Micro

-- 扩展 NPC 表以支持更丰富的交互
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS archetype TEXT; -- 原型 (e.g., 智者, 战士, 骗子)
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS dialogue_style TEXT; -- 对话风格 (e.g., 谜语人, 直率, 暴躁)
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS backstory TEXT; -- 背景故事
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS avatar_url TEXT; -- 头像URL

-- 插入更多细粒度地点示例 (需要先有父节点)
-- 假设 Q1 (CPC 数据尖塔) 是父节点
INSERT INTO locations (hexagram_id, trigram, name, description, owner_faction_id, is_virtual, parent_id, location_type, detail_level) VALUES
('Q1_L2_GATE', 'Heaven', '尖塔底层安检门', '全副武装的机械卫兵把守着入口，红外扫描仪扫视着每一个进出的人。', 'cpc', FALSE, 'Q1', 'zone', 2),
('Q1_L3_CORE', 'Heaven', '中央处理器冷凝室', '巨大的液氮管道纵横交错，空气中弥漫着臭氧的味道。', 'cpc', FALSE, 'Q1', 'building', 3),
('Q2_L2_MARKET', 'Earth', '404区黑市', '霓虹灯闪烁的地下集市，贩卖着各种非法义体和记忆芯片。', 'underworld', FALSE, 'Q2', 'zone', 2)
ON CONFLICT (hexagram_id) DO NOTHING;

-- 插入更多 NPC
INSERT INTO npcs (id, name, role, faction_id, personality, function_desc, is_legendary, current_location_id, archetype, dialogue_style, backstory) VALUES
('npc_001', '老杰克', '义体医生', 'underworld', '粗鲁但手艺好', '提供廉价治疗', FALSE, 'Q2_L2_MARKET', 'Mentor', '粗犷', '前军队军医，因违抗命令被开除。'),
('npc_002', '露娜', '情报贩子', 'crawler', '机灵、贪财', '出售低级情报', FALSE, 'Q2_L2_MARKET', 'Trickster', '神秘', '在下城长大的孤儿，在这个街区没有她不知道的秘密。'),
('npc_003', 'K-101', '巡逻卫兵', 'cpc', '冷漠、机械', '维持治安', FALSE, 'Q1_L2_GATE', 'Guardian', '机械', '量产型战斗机器人，编号101。')
ON CONFLICT (id) DO NOTHING;

-- Factions
INSERT INTO factions (id, name, role, description, sub_units) VALUES
('cpc', '中央协议委员会 (CPC)', '宇宙立法者 / 方舟控制者', '象征绝对不可撼动的秩序。掌握着''方舟船票''的分配权。', ARRAY['国民武装警察 (K-9)', '方舟发射局', '最高仲裁庭']),
('homeland', '热土网络集团', '精神垄断 / 记忆银行', '掌控BCI入口与虚拟世界。通过''新视界传媒''控制舆论，通过记忆市场收割价值。', ARRAY['记忆市场', '神经接口部', '新视界传媒 (Neo-Vision)']),
('crawler', '爬虫联盟', '信息解构者', '去中心化的黑客组织。试图打破信息垄断。', ARRAY['薇拉小组', '加密联络网', '深渊潜行者 (Netrunners)']),
('underworld', '深渊联合体', '地下生财 / 灰色地带', '由黑市医生、走私客组成的松散联盟。', ARRAY['黑螺生化 (Black Helix)', '黑水港工会']),
('resistance', '自由意志武装', '武力反抗', '以九峰山为基地的反抗军。', ARRAY['第一独立团', '数据守墓人 (Monks)'])
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO locations (hexagram_id, trigram, name, description, owner_faction_id, is_virtual) VALUES
('Q1', 'Heaven', 'CPC 数据尖塔 & 近地轨道', '宇宙的权力极点。地面是直插云霄的黑色方尖碑。', 'cpc', FALSE),
('Q2', 'Earth', '下城 404 区 (旧土层)', '位于地表以下的废弃防核掩体层。终年酸雨。', 'underworld', FALSE),
('Q30', 'Fire', '热土世界 (HomeLand Virtual)', '构筑在物理服务器之上的纯意识空间。', 'homeland', TRUE),
('Q29', 'Water', '黑水港 (Black Water Port)', '城市地下的巨型排污与冷却水循环系统。', 'underworld', FALSE),
('Q57', 'Wind', '赤色记忆茶馆 & 散热阵列', '位于巨大风冷散热塔的阴影下。', 'crawler', FALSE),
('Q51', 'Thunder', '聚变工业区 (The Forge)', '国民武装警察的装备生产地。', 'cpc', FALSE),
('Q52', 'Mountain', '九峰山 (The Barrier)', '新都边界外的险峻山区。', 'resistance', FALSE)
ON CONFLICT (hexagram_id) DO NOTHING;

-- NPCs
INSERT INTO npcs (id, name, role, faction_id, personality, function_desc, is_legendary) VALUES
('observer', '观测者', '记忆市场看门人', 'homeland', '中立、神秘、全知但不干预', '触发''悟性觉醒''任务链', TRUE),
('vera', '薇拉 (Vera)', '加密信息联络员', 'crawler', '激进、年轻天才、有些情绪化', '发布高风险''解构协议''任务', TRUE),
('k9', '警督 K-9', '国民警察高级执行官', 'cpc', '冷酷、秩序狂', '主要反派，根据声望值追捕玩家', TRUE),
('operator', '接线员', '脑机接口管理员', NULL, '疲惫、市侩、看钱办事', '调度玩家进出虚拟世界', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Core Rules
INSERT INTO core_rules (version, currency_name, currency_symbol, origin_event, ultimate_crisis) VALUES
('1.0', 'Re Coin', 'Ⓡ', '1983年量子回响', '大重叠 (The Great Overlap)');
