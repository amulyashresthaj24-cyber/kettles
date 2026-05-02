"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAppOrigin, getFriendlySupabaseErrorMessage, getSupabaseClient } from "./supabase";
import { useApp } from "./store-supabase";

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStoreUser({ 
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
          email: session.user.email 
        });
        loadAll();
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
          emailRedirectTo: `${getAppOrigin()}/auth`,
        }
      });
    } catch (error) {
      throw new Error(getFriendlySupabaseErrorMessage(error));
    }
    const { error } = result;
    if (error) throw error;
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
