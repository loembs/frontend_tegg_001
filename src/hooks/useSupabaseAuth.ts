/**
 * Hook personnalisé pour gérer l'authentification Supabase
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../lib/supabaseClient';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useSupabaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Vérifier la session actuelle
    checkSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          await loadProfile(session?.user?.id);
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setAuthState(prev => ({
          ...prev,
          user: session.user,
          loading: false,
        }));
        await loadProfile(session.user.id);
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de session',
      }));
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        profile: data,
      }));
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur de chargement du profil',
      }));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthState(prev => ({
        ...prev,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }

    return { success: true, data };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      setAuthState(prev => ({
        ...prev,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }

    return { success: true, data };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      profile: null,
      loading: false,
      error: null,
    });
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.profile?.id) return { success: false, error: 'No profile' };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authState.profile.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    setAuthState(prev => ({
      ...prev,
      profile: data,
    }));

    return { success: true, data };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile: () => authState.profile?.id && loadProfile(authState.profile.id),
  };
}
