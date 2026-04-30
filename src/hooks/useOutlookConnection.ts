'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface OutlookConnectionState {
  connected: boolean;
  email: string;
  loading: boolean;
}

export function useOutlookConnection(): OutlookConnectionState {
  const [state, setState] = useState<OutlookConnectionState>({ connected: false, email: '', loading: true });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setState({ connected: false, email: '', loading: false });
        return;
      }
      supabase
        .from('outlook_tokens')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setState({ connected: true, email: data.email || '', loading: false });
            try {
              const existing = JSON.parse(localStorage.getItem('crm_outlook_prefs') || '{}');
              localStorage.setItem('crm_outlook_prefs', JSON.stringify({ ...existing, connected: true, email: data.email || '' }));
            } catch {}
          } else {
            setState({ connected: false, email: '', loading: false });
          }
        });
    });
  }, []);

  return state;
}
