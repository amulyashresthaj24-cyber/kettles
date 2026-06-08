"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getFriendlySupabaseErrorMessage, getSupabaseClient, getAppOrigin } from "./supabase";
import { useApp } from "./store-supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    metadata?: { name?: string }
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setStoreUser, loadAll, clearAll } = useApp();

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      console.error("Failed to initialize Supabase", error);
      setLoading(false);
      return;
    }

    // Check initial session - fast check first
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        setStoreUser({ 
          name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || "User",
          email: currentUser.email 
        });
        // Load data async after setting user
        loadAll();
      }
      
      setLoading(false);
    }).catch((error) => {
      setLoading(false);
      console.error("Failed to restore session", error);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStoreUser({
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
          email: session.user.email
        });
        // Only full-reload on real sign-in / account changes. TOKEN_REFRESHED is a
        // background JWT rotation (~hourly) — no app data changed, so skip the reload.
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
          loadAll();
        }
      } else {
        setStoreUser(null);
        clearAll();
      }
    });

    return () => subscription.unsubscribe();
  }, [setStoreUser, loadAll, clearAll]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: { name?: string }) => {
    const supabase = getSupabaseClient();
    let result;
    try {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          // Redirect to auth/callback after email confirmation (if enabled in Supabase)
          emailRedirectTo: `${getAppOrigin()}/auth/callback`,
        }
      });
    } catch (error) {
      throw new Error(getFriendlySupabaseErrorMessage(error));
    }
    const { data, error } = result;
    if (error) throw error;
    return { requiresEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
