import { create } from 'zustand';
import { fetch } from '@tauri-apps/plugin-http';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

import { SupportedLanguage } from './translations';

export interface UsageData {
  service: string;
  status: 'active' | 'error';
  usage_percentage: number;
  messages_remaining: number;
  limit_reset_time: string;
  last_sync: string;
  error_code: string | null;
}

export interface HistoricalData {
  id: string;
  created_at: string;
  usage_percentage: number;
  status: string;
}

interface AppState {
  currentData: UsageData | null;
  historicalData: HistoricalData[];
  isExpanded: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Settings
  sessionKey: string;
  showSettings: boolean;
  language: SupportedLanguage;
  alertThreshold: number;
  use24h: boolean;
  isCompact: boolean;
  
  // Actions
  toggleExpanded: () => void;
  toggleSettings: () => void;
  setSessionKey: (key: string) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setAlertThreshold: (val: number) => void;
  setUse24h: (val: boolean) => void;
  setCompact: (val: boolean) => void;
  loadSettings: () => void;
  
  fetchCurrentData: () => Promise<void>;
  fetchHistoricalData: () => Promise<void>;
  startPolling: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentData: null,
  historicalData: [],
  isExpanded: false,
  isLoading: true,
  error: null,
  
  sessionKey: '',
  showSettings: false,
  language: 'fr',
  alertThreshold: 80,
  use24h: true,
  isCompact: false,
  
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  
  setSessionKey: (key: string) => {
    localStorage.setItem('anthrostat_session_key', key);
    set({ sessionKey: key });
    if (key) get().fetchCurrentData();
  },
  
  setLanguage: (lang: SupportedLanguage) => {
    localStorage.setItem('anthrostat_lang', lang);
    set({ language: lang });
  },
  
  setAlertThreshold: (val: number) => {
    localStorage.setItem('anthrostat_threshold', val.toString());
    set({ alertThreshold: val });
  },
  
  setUse24h: (val: boolean) => {
    localStorage.setItem('anthrostat_24h', val.toString());
    set({ use24h: val });
  },
  
  setCompact: (val: boolean) => {
    localStorage.setItem('anthrostat_compact', val.toString());
    set({ isCompact: val });
  },
  
  loadSettings: () => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('anthrostat_session_key') || '';
      const lang = (localStorage.getItem('anthrostat_lang') as SupportedLanguage) || 'fr';
      const threshold = parseInt(localStorage.getItem('anthrostat_threshold') || '80', 10);
      const use24h = localStorage.getItem('anthrostat_24h') !== 'false';
      const compact = localStorage.getItem('anthrostat_compact') === 'true';
      
      set({ 
        sessionKey: storedKey,
        language: lang,
        alertThreshold: threshold,
        use24h,
        isCompact: compact
      });
      
      if (!storedKey) {
        set({ showSettings: true });
      }
    }
  },
  
  fetchCurrentData: async () => {
    const { sessionKey } = get();
    if (!sessionKey) {
      set({ error: 'Missing Session Key' });
      return;
    }

    try {
      set({ error: null });
      
      // Step 1: Fetch Organizations (to validate token and get UUID)
      const orgResponse = await fetch('https://claude.ai/api/organizations', {
        method: 'GET',
        headers: {
          'Cookie': `sessionKey=${sessionKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!orgResponse.ok) {
        throw new Error(`Auth failed: ${orgResponse.status}`);
      }
      
      const orgs = await orgResponse.json();
      if (!orgs || orgs.length === 0) throw new Error('No organizations found');
      
      const orgId = orgs[0].uuid;
      
      // Fetch usage stats
      const usageResponse = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
        method: 'GET',
        headers: {
          'Cookie': `sessionKey=${sessionKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      const isOk = usageResponse.ok;
      let actualPercentage = 0;
      let limitResetTime = "--:--";
      
      if (isOk) {
        try {
          const usageData = await usageResponse.json();
          if (usageData?.five_hour) {
             actualPercentage = Math.round(usageData.five_hour.utilization || 0);
             if (usageData.five_hour.resets_at) {
               const resetDate = new Date(usageData.five_hour.resets_at);
               limitResetTime = resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
             }
          }
        } catch (e) {
          console.error("Could not parse usage JSON", e);
        }
      }
      
      const newData: UsageData = {
        service: 'claude_web',
        status: isOk ? 'active' : 'error',
        usage_percentage: actualPercentage,
        messages_remaining: isOk ? Math.round(45 * (1 - (actualPercentage / 100))) : 0, // Estimating ~45 msgs per 5h max
        limit_reset_time: limitResetTime,
        last_sync: new Date().toISOString(),
        error_code: null
      };

      set({ currentData: newData, error: null });
      
      // Step 3: Push to Supabase directly
      await supabase.from('usage_logs').insert([{
        usage_percentage: newData.usage_percentage,
        status: newData.status
      }]);
      
      // Step 4: Refresh history graph
      get().fetchHistoricalData();

    } catch (error: any) {
      console.error('Failed to fetch from Claude API:', error);
      set({ error: error.message || 'API Error' });
    }
  },
  
  fetchHistoricalData: async () => {
    try {
      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false }) // Get newest first
        .limit(20); // Limit to last 20 points
        
      if (error) throw error;
      
      if (data) {
        // Reverse array for Recharts to show oldest -> newest left to right
        set({ historicalData: data.reverse() });
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  startPolling: () => {
    get().loadSettings();
    get().fetchHistoricalData();
    
    if (get().sessionKey) {
      get().fetchCurrentData();
    }
    
    setInterval(() => {
      if (get().sessionKey) {
        get().fetchCurrentData();
      }
    }, 300000); // 5 minutes
  }
}));
