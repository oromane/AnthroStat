import { create } from 'zustand';
import { fetch } from '@tauri-apps/plugin-http';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  toggleExpanded: () => void;
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
  
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
  
  fetchCurrentData: async () => {
    try {
      // Use Tauri native HTTP client to avoid WebView CORS
      const response = await fetch('http://localhost:5678/webhook/claude-status', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      set({ currentData: data, error: null });
    } catch (error) {
      console.error('Failed to fetch current data:', error);
      set({ error: 'Failed to connect to n8n webhook' });
    }
  },
  
  fetchHistoricalData: async () => {
    try {
      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
        
      if (error) throw error;
      
      if (data) {
        set({ historicalData: data });
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  startPolling: () => {
    // Initial fetch
    get().fetchCurrentData();
    get().fetchHistoricalData();
    
    // Poll every 5 minutes (300000 ms)
    setInterval(() => {
      get().fetchCurrentData();
      get().fetchHistoricalData();
    }, 300000);
  }
}));
