import { supabase } from '@/lib/supabase';

export interface NPC {
  id: string;
  name: string;
  role: string;
  faction_id: string;
  personality: string;
  function_desc: string;
  is_legendary: boolean;
  current_location_id?: string;
}

export async function getNPCs(limit = 10): Promise<NPC[]> {
  const { data } = await supabase
    .from('npcs')
    .select(`
      *,
      factions (name),
      locations (name)
    `)
    .limit(limit);
  
  return data || [];
}

export async function getNPCById(id: string): Promise<NPC | null> {
  const { data } = await supabase
    .from('npcs')
    .select('*')
    .eq('id', id)
    .single();
  
  return data;
}
