import "react-native-url-polyfill/auto"
import * as SecureStore from "expo-secure-store"
import { getSupabaseClient } from "@unipar/api"

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = getSupabaseClient({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  storage: ExpoSecureStoreAdapter,
})
