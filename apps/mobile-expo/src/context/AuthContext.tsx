import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import {
  deleteCurrentAccount,
  updateCurrentUserPassword,
} from '@fieldbook/api-client';

import { analytics, errorProperties } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type SignUpProfileSeed = {
  firstName: string;
  lastName: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /**
   * Creates a new auth.users row. When `profile` is provided, first / last
   * name are written to `raw_user_meta_data`, which the `handle_new_user`
   * trigger reads to seed the matching `public.profiles` row. The same
   * Supabase signUp call also creates the user's session in dev (email
   * confirmations disabled), so a follow-up sign-in is usually unnecessary.
   */
  signUp: (
    email: string,
    password: string,
    profile?: SignUpProfileSeed,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  /** Wraps `auth.updateUser({ password })`. Throws on failure. */
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  /**
   * Calls the `delete-account` Edge Function. On success the local session
   * is signed out so `AuthenticatedShell` reroutes to the sign-in screen.
   */
  deleteAccount: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    void supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .catch(() => {
        // Offline/unreachable API should not hard-fail local UI development.
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      signUp: async (email, password, profile) => {
        const options = profile
          ? {
              data: {
                first_name: profile.firstName.trim(),
                last_name: profile.lastName.trim(),
              },
            }
          : undefined;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          ...(options ? { options } : {}),
        });
        return { error };
      },
      signOut: async () => {
        analytics.capture('signed_out', { source: 'manual' });
        await supabase.auth.signOut();
        analytics.reset();
      },
      updatePassword: async (newPassword) => {
        try {
          await updateCurrentUserPassword(supabase, newPassword);
          return { error: null };
        } catch (e) {
          return {
            error:
              e instanceof Error
                ? e
                : new Error(typeof e === 'string' ? e : 'Could not update password.'),
          };
        }
      },
      deleteAccount: async () => {
        try {
          await deleteCurrentAccount(supabase);
          analytics.capture('account_delete_succeeded', { source: 'profile' });
          await supabase.auth.signOut();
          analytics.reset();
          return { error: null };
        } catch (e) {
          analytics.capture('account_delete_failed', {
            source: 'profile',
            ...errorProperties(e),
          });
          return {
            error:
              e instanceof Error
                ? e
                : new Error(typeof e === 'string' ? e : 'Could not delete account.'),
          };
        }
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
