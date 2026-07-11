"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Home() {
  const { currentData, historicalData, startPolling, isExpanded, toggleExpanded, error } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    startPolling();
  }, [startPolling]);

  // Handle resizing the window when toggle happens
  useEffect(() => {
    if (!mounted) return;
    
    async function updateWindowSize() {
      try {
        const appWindow = getCurrentWindow();
        if (isExpanded) {
          // Expanded size to show graph
          await appWindow.setSize(new (window as any).__TAURI_INTERNALS__.LogicalSize(320, 400));
        } else {
          // Compact size
          await appWindow.setSize(new (window as any).__TAURI_INTERNALS__.LogicalSize(320, 160));
        }
      } catch (e) {
        console.error("Failed to resize window:", e);
      }
    }
    
    // updateWindowSize(); // Disabling dynamic resize as per spec "not treated during init phase"
  }, [isExpanded, mounted]);

  if (!mounted) return null;

  const isError = currentData?.status === 'error' || error;
  const primaryColor = isError ? 'var(--color-anthropic-error)' : 'var(--color-anthropic-primary)';
  const usageText = currentData ? `${currentData.usage_percentage}%` : '--%';
  const messagesText = currentData ? `${currentData.messages_remaining} left` : '';
  const resetText = currentData ? `Resets at ${currentData.limit_reset_time}` : '';
  
  const formattedDate = currentData 
    ? new Date(currentData.last_sync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    : '--:--';

  return (
    <main className="flex flex-col h-screen w-screen bg-anthropic-bg text-anthropic-text rounded-[16px] border border-anthropic-border overflow-hidden">
      
      {/* Header - Draggable Region */}
      <div 
        data-tauri-drag-region
        className="flex items-center justify-between px-5 pt-5 pb-2 cursor-move"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="text-xl leading-none" style={{ color: primaryColor }}>•</span>
          <h1 className="font-semibold text-sm tracking-wide">AnthroStat</h1>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: currentData?.status === 'active' ? '#4CAF50' : 'var(--color-anthropic-error)' }}
          />
          <button 
            onClick={toggleExpanded}
            className="text-anthropic-subtext hover:text-anthropic-text transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Data Zone */}
      <div className="flex-1 px-5 py-2 flex flex-col justify-center">
        {isError && !currentData ? (
          <div className="flex items-center justify-center gap-2 text-anthropic-error h-[40px]">
            <AlertCircle size={18} />
            <span className="font-semibold text-sm">{error || 'Connection Error'}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="font-semibold text-2xl leading-none">{usageText}</span>
              <span className="text-anthropic-subtext text-xs">{messagesText}</span>
            </div>
            
            <div className="h-2 w-full bg-anthropic-border rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${currentData?.usage_percentage || 0}%`,
                  backgroundColor: primaryColor
                }}
              />
            </div>
            
            {isError && currentData?.error_code && (
              <span className="text-anthropic-error text-xs font-semibold">
                {currentData.error_code}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Chart Zone */}
      {isExpanded && (
        <div className="h-[200px] w-full px-4 py-2 border-t border-anthropic-border/50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <XAxis 
                dataKey="created_at" 
                tickFormatter={(timeStr) => new Date(timeStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                stroke="var(--color-anthropic-subtext)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                hide 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-anthropic-bg)', border: '1px solid var(--color-anthropic-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-anthropic-text)' }}
                labelFormatter={(timeStr) => new Date(timeStr).toLocaleTimeString()}
              />
              <Line 
                type="monotone" 
                dataKey="usage_percentage" 
                stroke="var(--color-anthropic-primary)" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--color-anthropic-text)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-5 pt-2 flex justify-between items-center text-anthropic-subtext text-xs">
        <span>{resetText}</span>
        <span>Sync: {formattedDate}</span>
      </div>
      
    </main>
  );
}
