/**
 * AnthroStat — global application store (Zustand)
 * Holds usage data, historical series, user settings and the polling loop
 * that syncs against Claude's usage API every 5 minutes.
 *
 * Author:  Oromane <https://github.com/oromane>
 * Repo:    https://github.com/oromane/AnthroStat
 * License: MIT
 */
import { create } from 'zustand';
import { fetch } from '@tauri-apps/plugin-http';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

import { SupportedLanguage } from './translations';

export interface UsageData {
  service: string;
  status: 'active' | 'error';
  usage_percentage: number;
  weekly_percentage: number;
  messages_remaining: number;
  limit_reset_time: string;
  last_sync: string;
  error_code: string | null;
}

export interface HistoricalData {
  id: string;
  created_at: string;
  usage_percentage: number;
  weekly_percentage: number;
  status: string;
}

export type ThemeType = 'dark' | 'light' | 'system';
export type ChartRange = '1h' | '5h' | '1d' | '1w';

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
  alertThreshold: number; // Orange warning
  dangerThreshold: number; // Red warning
  use24h: boolean;
  enableNotifications: boolean;
  enableAutostart: boolean;
  alwaysOnTop: boolean;
  theme: ThemeType;
  hideFromTaskbar: boolean;
  chartRange: ChartRange;
  lastAlertedLevel: 'none' | 'warn' | 'danger';
  
  // Actions
  toggleExpanded: () => void;
  toggleSettings: () => void;
  setSessionKey: (key: string) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setAlertThreshold: (val: number) => void;
  setDangerThreshold: (val: number) => void;
  setUse24h: (val: boolean) => void;
  setEnableNotifications: (val: boolean) => void;
  setEnableAutostart: (val: boolean) => void;
  setAlwaysOnTop: (val: boolean) => void;
  setTheme: (val: ThemeType) => void;
  setHideFromTaskbar: (val: boolean) => void;
  setChartRange: (val: ChartRange) => void;
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
  dangerThreshold: 95,
  use24h: true,
  enableNotifications: true,
  enableAutostart: false,
  alwaysOnTop: false,
  theme: 'dark',
  hideFromTaskbar: false,
  chartRange: '5h',
  lastAlertedLevel: 'none',
  
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
  
  setDangerThreshold: (val: number) => {
    localStorage.setItem('anthrostat_danger_threshold', val.toString());
    set({ dangerThreshold: val });
  },
  
  setUse24h: (val: boolean) => {
    localStorage.setItem('anthrostat_24h', val.toString());
    set({ use24h: val });
  },
  
  setTheme: (val: ThemeType) => {
    localStorage.setItem('anthrostat_theme', val);
    set({ theme: val });
    if (typeof document !== 'undefined') {
      if (val === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  },
  
  setHideFromTaskbar: (val: boolean) => {
    localStorage.setItem('anthrostat_hide_taskbar', val.toString());
    set({ hideFromTaskbar: val });
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().setSkipTaskbar(val).catch(console.error);
      });
    }
  },
  
  setChartRange: (val: ChartRange) => {
    localStorage.setItem('anthrostat_chart_range', val);
    set({ chartRange: val });
    get().fetchHistoricalData();
  },
  
  setEnableNotifications: async (val: boolean) => {
    localStorage.setItem('anthrostat_notifications', val.toString());
    set({ enableNotifications: val });
    if (val) {
      const granted = await isPermissionGranted();
      if (!granted) {
        await requestPermission();
      }
    }
  },
  
  setEnableAutostart: (val: boolean) => {
    localStorage.setItem('anthrostat_autostart', val.toString());
    set({ enableAutostart: val });
  },
  
  setAlwaysOnTop: (val: boolean) => {
    localStorage.setItem('anthrostat_alwaysontop', val.toString());
    set({ alwaysOnTop: val });
  },
  
  loadSettings: () => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('anthrostat_session_key') || '';
      const lang = (localStorage.getItem('anthrostat_lang') as SupportedLanguage) || 'fr';
      const threshold = parseInt(localStorage.getItem('anthrostat_threshold') || '80', 10);
      const danger = parseInt(localStorage.getItem('anthrostat_danger_threshold') || '95', 10);
      const use24 = localStorage.getItem('anthrostat_24h') !== 'false';
      const notifs = localStorage.getItem('anthrostat_notifications') !== 'false';
      const autostart = localStorage.getItem('anthrostat_autostart') === 'true';
      const aot = localStorage.getItem('anthrostat_alwaysontop') === 'true';
      const th = (localStorage.getItem('anthrostat_theme') as ThemeType) || 'dark';
      const hideTask = localStorage.getItem('anthrostat_hide_taskbar') === 'true';
      const range = (localStorage.getItem('anthrostat_chart_range') as ChartRange) || '5h';
      
      set({
        sessionKey: storedKey,
        language: lang,
        alertThreshold: threshold,
        dangerThreshold: danger,
        use24h: use24,
        enableNotifications: notifs,
        enableAutostart: autostart,
        alwaysOnTop: aot,
        theme: th,
        hideFromTaskbar: hideTask,
        chartRange: range
      });
      
      // Apply theme
      if (th === 'light') {
        document.documentElement.classList.add('light');
      }
      
      // Apply taskbar
      if ('__TAURI_INTERNALS__' in window) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().setSkipTaskbar(hideTask).catch(console.error);
        });
      }
      
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
      
      const cleanSessionKey = decodeURIComponent(sessionKey.trim());
      
      const commonHeaders = {
        'Cookie': `sessionKey=${cleanSessionKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      };

      const orgResponse = await fetch('https://claude.ai/api/organizations', {
        method: 'GET',
        headers: commonHeaders
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
        headers: commonHeaders
      });
      
      const isOk = usageResponse.ok;
      let actualPercentage = 0;
      let weeklyPercentage = 0;
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
          if (usageData?.seven_day) {
             weeklyPercentage = Math.round(usageData.seven_day.utilization || 0);
          }
        } catch (e) {
          console.error("⚠️ [AnthroStat] Could not parse usage JSON", e);
        }
      }
      
      const newData: UsageData = {
        service: 'claude_web',
        status: isOk ? 'active' : 'error',
        usage_percentage: actualPercentage,
        weekly_percentage: weeklyPercentage,
        messages_remaining: isOk ? Math.round(45 * (1 - (actualPercentage / 100))) : 0, // Estimating ~45 msgs per 5h max
        limit_reset_time: limitResetTime,
        last_sync: new Date().toISOString(),
        error_code: null
      };

      // Handle Notifications
      const { enableNotifications, alertThreshold, dangerThreshold, lastAlertedLevel } = get();
      if (enableNotifications && isOk) {
        let currentLevel: 'none' | 'warn' | 'danger' = 'none';
        if (actualPercentage >= dangerThreshold) currentLevel = 'danger';
        else if (actualPercentage >= alertThreshold) currentLevel = 'warn';

        if (currentLevel !== 'none' && currentLevel !== lastAlertedLevel) {
          const granted = await isPermissionGranted();
          if (granted) {
            sendNotification({
              title: currentLevel === 'danger' ? '⚠️ Limite Claude imminente' : 'Attention : Limite Claude',
              body: `Votre utilisation a atteint ${actualPercentage}%.`
            });
          }
          set({ lastAlertedLevel: currentLevel });
        } else if (currentLevel === 'none' && lastAlertedLevel !== 'none') {
          // Reset alert state when usage drops (e.g., limit reset)
          set({ lastAlertedLevel: 'none' });
        }
      }

      set({ currentData: newData, error: null });
      
      // Step 3: Push to Supabase directly
      await supabase.from('usage_logs').insert([{
        usage_percentage: newData.usage_percentage,
        status: newData.status
      }]);
      
      // Step 4: Refresh history graph
      console.log(`✨ [AnthroStat] Sync complete! Usage: ${actualPercentage}%`);
      get().fetchHistoricalData();

    } catch (error: any) {
      console.error('❌ [AnthroStat] Failed to fetch from Claude API:', error);
      set({ error: error.message || 'API Error' });
    }
  },
  
  fetchHistoricalData: async () => {
    try {
      const range = get().chartRange;
      const timeThreshold = new Date();
      
      switch(range) {
        case '1h': timeThreshold.setHours(timeThreshold.getHours() - 1); break;
        case '5h': timeThreshold.setHours(timeThreshold.getHours() - 5); break;
        case '1d': timeThreshold.setDate(timeThreshold.getDate() - 1); break;
        case '1w': timeThreshold.setDate(timeThreshold.getDate() - 7); break;
      }
      
      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .gte('created_at', timeThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(3000); // 3000 points covers a full week at 5m polling
        
      if (error) throw error;
      
      if (data) {
        // Reverse array for Recharts to show oldest -> newest left to right
        set({ historicalData: data.reverse() });
      }
    } catch (error) {
      console.error('❌ [AnthroStat] Failed to fetch historical data:', error);
    } finally {
      set({ isLoading: false