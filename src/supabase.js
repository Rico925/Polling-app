import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://xorcdeajyixvpcuaqmsr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcmNkZWFqeWl4dnBjdWFxbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODk1OTIsImV4cCI6MjA5NjU2NTU5Mn0.CGkyaVwfM8X4dO_MCDzUcmDPbj66KeJRyyMSK5cXdiA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});