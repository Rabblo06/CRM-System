import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = adminClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email || '',
      username: user.user_metadata?.username || (user.email || '').split('@')[0],
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      password_hash: 'oauth_user',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  return NextResponse.json({ ok: true });
}
