// lib/universe/geography.ts
import { supabase } from '@/lib/supabase';

export interface LocationData {
  hexagram_id: string;
  trigram?: string;
  name: string;
  description?: string;
  owner_faction_id?: string;
  biome?: string;
  pollution_level?: number;
  is_virtual?: boolean;
}

// 获取单个地点的状态
export async function getLocationState(hexagramId: string): Promise<LocationData | null> {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select(`
        *,
        factions (
          name,
          role
        )
      `)
      .eq('hexagram_id', hexagramId)
      .single();

    if (error) {
      console.error('Error fetching location:', error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Exception fetching location:', e);
    return null;
  }
}

// 获取所有地点
export async function getAllLocations(): Promise<LocationData[]> {
  const { data } = await supabase
    .from('locations')
    .select('*');
  
  return data || [];
}

