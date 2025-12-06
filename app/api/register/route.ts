import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uid = body.uid;

    // Check if user already exists
    const { data: existingUser } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (existingUser) {
      return NextResponse.json({ success: true, message: 'User already exists' });
    }

    // Create new user profile
    const { data: newUser, error } = await supabase.from('profiles').insert({
      id: uid,
      username: '流浪者',
      re_coin: 100, // Initial coins
      current_chapter: 0,
      created_at: new Date().toISOString()
    }).select().single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
