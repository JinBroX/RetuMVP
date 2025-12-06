export interface Location {
  id?: string;
  hexagram_id: string;
  name: string;
  description?: string;
  pollution_level?: number;
  biome?: string;
  owner_faction_id?: string;
  is_virtual?: boolean;
  parent_id?: string | null;
  location_type?: string;
  detail_level?: number;
  // Supabase timestamps
  created_at?: string;
}

export interface NPC {
  id: string;
  name: string;
  role?: string;
  avatar_url?: string;
  personality?: string;
  backstory?: string;
  function_desc?: string;
  dialogue_style?: string;
  current_location_id?: string;
  // Supabase timestamps
  created_at?: string;
}

export interface TimeState {
  retuYear: number;
  era: string;
  exactTime: string;
  isDay: boolean;
}

export interface UserProfile {
  id: string;
  username?: string;
  la_coin_balance?: number;
  current_location_id?: string;
  re_coin?: number;
  created_at?: string;
}

export interface StoryData {
  id: string;
  hexagram_id: string;
  title: string;
  content: string;
  options: StoryOption[];
  metadata?: Record<string, unknown>;
}

export interface StoryOption {
  text: string;
  next_chapter: number;
  action?: string;
}
