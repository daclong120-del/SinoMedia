/**
 * @fileoverview Supabase Client Configuration
 * Initializes and configures the Supabase client for the React Native application.
 * Handles authentication storage, session persistence, and URL polyfills.
 *
 * @author Your Name
 * @version 1.0.0
 */

import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/** Supabase project URL from environment variables */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

/** Supabase anonymous key from environment variables */
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/** Custom storage adapter that is safe for SSR (server-side rendering) and web/mobile */
const customStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};

/**
 * Configured Supabase client instance
 * Set up with safe storage for session persistence and proper auth configuration
 *
 * @constant {SupabaseClient} supabase - The configured Supabase client
 *
 * @example
 * // Use for authentication
 * const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 *
 * // Use for database operations
 * const { data, error } = await supabase.from('profiles').select('*');
 *
 * // Use for Edge Functions
 * const { data, error } = await supabase.functions.invoke('openai', { body: { message } });
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

