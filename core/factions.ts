import { supabase } from '@/lib/supabase';

export interface Faction {
  id: string;
  name: string;
  role: string;
  description: string;
  sub_units: string[];
}

export async function getFactions(): Promise<Faction[]> {
  const { data } = await supabase
    .from('factions')
    .select('*');
  
  return data || [];
}

export async function getFactionById(id: string): Promise<Faction | null> {
  const { data } = await supabase
    .from('factions')
    .select('*')
    .eq('id', id)
    .single();
  
  return data;
}
