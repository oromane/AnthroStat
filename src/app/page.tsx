"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { t, SupportedLanguage } from '@/store/translations';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { AlertCircle, ChevronDown, ChevronUp, Zap, Clock, Activity, Settings, Save, X, Github, MonitorOff, Maximize2 } from 'lucide-react';

export default function Home() {
  const { 
    currentData, historicalData, startPolling, 
    isExpanded, toggleExpanded, error,
    showSettings, toggleSettings, sessionKey, setSessionKey,
    language, setLanguage, alertThreshold, setAlertThreshold,
    use24h, setUse24h, isCompact, setCompact
  } = useAppStore();
  
  const [mounted, setMounted] = useState(false);
  
  // Settings Form State
  const [tempKey, setTempKey] = useState("");
  const [tempLang, setTempLang] = useState<SupportedLanguage>('fr');
  const [tempThresh, setTempThresh] = useState(80);
  const [temp24h, setTemp24h] = useState(true);

  useEffect(() => {
    setMounted(true);
    startPolling();
    
    // Global keyboard shortcut to toggle compact mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        setCompact(!isCompact);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startPolling, isCompact, setCompact]);

  useEffect(() => {
    setTempKey(sessionKey);
    setTempLang(language);
    setTempThresh(alertThreshold);
    setTemp24h(use24h);
  }, [sessionKey, language, alertThreshold, use24h, showSettings]);

  if (!mounted) return null;

  const percentage = currentData?.usage_percentage || 0;
  
  // Custom warning thresholds logic
  const isAlert = percentage >= alertThreshold;
  const isError = currentData?.status === 'error' || error;
  const primaryColor = (isError || isAlert) ? 'var(--color-anthropic-error)' : 'var(--color-anthropic-primary)';
  
  const radius = isCompact ? 28 : 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleSaveSettings = () => {
    setSessionKey(tempKey);
    setLanguage(tempLang);
    setAlertThreshold(tempThresh);
    setUse24h(temp24h);
    toggleSettings();
  };

  const formatTime = (timeStr: string) => {
    if (timeStr === '--:--') return timeStr;
    const [h, m] = timeStr.split(':');
    if (use24h) return timeStr;
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${suffix}`;
  };

  return (
    <main className="flex flex-col h-screen w-screen bg-transparent p-2">
      <div className="glass-panel flex-1 rounded-2xl flex flex-col overflow-hidden relative">
        
        <div 
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none transition-all duration-1000"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Header */}
        <div data-tauri-drag-region className="flex items-center justify-between px-4 pt-4 pb-2 cursor-move z-10">
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className={`absolute w-3 h-3 rounded-full opacity-40 ${isError ? '' : 'animate-pulse-slow'}`} style={{ backgroundColor: primaryColor }} />
              <div className="w-2 h-2 rounded-full z-10" style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }} />
            </div>
            {!isCompact && <h1 className="font-bold text-sm tracking-widest text-gradient uppercase">{t(language, 'app_title')}</h1>}
          </div>
          
          <div className="flex items-center gap-1">
            {!isCompact && (
              <a href="https://github.com/oromane/AnthroStat" target="_blank" rel="noreferrer" className="text-anthropic-subtext hover:text-white transition-all duration-300 p-1.5 rounded-full hover:bg-white/10">
                <Github size={14} />
              </a>
            )}
            <button onClick={() => setCompact(!isCompact)} className="text-anthropic-subtext hover:text-white transition-all duration-300 p-1.5 rounded-full hover:bg-white/10" title={t(language, 'compact_mode')}>
              {isCompact ? <Maximize2 size={14} /> : <MonitorOff size={14} />}
            </button>
            <button onClick={toggleSettings} className="text-anthropic-subtext hover:text-white transition-all duration-300 p-1.5 rounded-full hover:bg-white/10">
              <Settings size={14} />
            </button>
            {!isCompact && (
              <button onClick={toggleExpanded} className="text-anthropic-subtext hover:text-white transition-all duration-300 p-1.5 rounded-full hover:bg-white/10">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>

        {!isCompact && <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />}

        {/* Settings Overlay */}
        {showSettings ? (
          <div className="flex-1 flex flex-col p-4 z-20 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 absolute inset-0 rounded-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t(language, 'settings')}</h2>
              <button onClick={toggleSettings} className="text-anthropic-subtext hover:text-white"><X size={16}/></button>
            </div>
            
            <div className="space-y-3 flex-1">
              <div>
                <label className="text-[10px] uppercase text-anthropic-subtext mb-1 block">{t(language, 'session_key')}</label>
                <input type="password" value={tempKey} onChange={(e) => setTempKey(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-anthropic-primary" />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-anthropic-subtext mb-1 block">{t(language, 'language')}</label>
                  <select value={tempLang} onChange={(e) => setTempLang(e.target.value as SupportedLanguage)} className="w-full bg-black/50 border border-white/10 rounded-md p-1.5 text-xs text-white focus:outline-none">
                    <option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="pt">Português</option><option value="ru">Русский</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-anthropic-subtext mb-1 block">{t(language, 'alert_threshold')}</label>
                  <input type="number" value={tempThresh} onChange={(e) => setTempThresh(parseInt(e.target.value)||80)} className="w-full bg-black/50 border border-white/10 rounded-md p-1.5 text-xs text-white focus:outline-none" min="1" max="100" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="use24h" checked={temp24h} onChange={(e) => setTemp24h(e.target.checked)} className="accent-anthropic-primary" />
                <label htmlFor="use24h" className="text-xs text-white">{t(language, 'time_format')}</label>
              </div>
            </div>
            
            <button onClick={handleSaveSettings} className="mt-4 w-full flex items-center justify-center gap-2 bg-anthropic-primary/20 hover:bg-anthropic-primary text-white py-2 rounded-md font-semibold text-xs transition-colors border border-anthropic-primary/30 hover:border-anthropic-primary">
              <Save size={14} /> {t(language, 'save')}
            </button>
          </div>
        ) : (
          <>
            {/* Main Data Zone */}
            <div className={`flex-1 px-4 flex flex-col justify-center items-center z-10 ${isCompact ? 'py-1' : 'py-3'}`}>
              {isError && !currentData ? (
                <div className="flex flex-col items-center justify-center gap-2 text-anthropic-error animate-float">
                  <AlertCircle size={isCompact ? 24 : 32} />
                  {!isCompact && <span className="font-semibold text-xs text-center">{t(language, 'connection_lost')}</span>}
                </div>
              ) : (
                <div className={`flex w-full items-center ${isCompact ? 'justify-center' : 'justify-between'}`}>
                  
                  {/* Gauge */}
                  <div className="relative flex items-center justify-center">
                    <svg className={`transform -rotate-90 ${isCompact ? 'w-16 h-16' : 'w-24 h-24'}`}>
                      <circle cx={isCompact ? 32 : 48} cy={isCompact ? 32 : 48} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={isCompact ? "4" : "6"} fill="transparent" />
                      <circle
                        cx={isCompact ? 32 : 48} cy={isCompact ? 32 : 48} r={radius} stroke={primaryColor} strokeWidth={isCompact ? "4" : "6"} fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 ${isCompact ? '3px' : '6px'} ${primaryColor}80)` }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className={`font-extrabold tracking-tighter ${isCompact ? 'text-xl' : 'text-3xl'}`} style={{ color: primaryColor, textShadow: `0 0 10px ${primaryColor}40` }}>
                        {percentage}<span className="text-[10px] text-anthropic-subtext ml-0.5">%</span>
                      </span>
                    </div>
                  </div>

                  {/* Stats (Hidden in compact mode) */}
                  {!isCompact && (
                    <div className="flex flex-col gap-3 text-right">
                      <div className="flex flex-col items-end group">
                        <div className="flex items-center gap-1.5 text-anthropic-subtext mb-0.5">
                          <span className="text-[9px] font-medium tracking-wider uppercase">{t(language, 'messages')}</span>
                          <Zap size={9} className="text-yellow-500/70" />
                        </div>
                        <span className="font-bold text-lg leading-none text-white">{currentData?.messages_remaining ?? '--'}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-anthropic-subtext mb-0.5">
                          <span className="text-[9px] font-medium tracking-wider uppercase">{t(language, 'reset_at')}</span>
                          <Clock size={9} className="text-blue-400/70" />
                        </div>
                        <span className="font-semibold text-xs text-white/90">{formatTime(currentData?.limit_reset_time ?? '--:--')}</span>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Area Chart (Hidden in compact mode) */}
            {isExpanded && !isCompact && (
              <div className="h-[140px] w-full px-2 pb-2 pt-3 relative animate-in fade-in slide-in-from-top-4 duration-500 z-10 border-t border-white/5 bg-black/20">
                <div className="absolute top-2 left-4 flex items-center gap-1.5 text-[9px] font-medium text-anthropic-subtext uppercase tracking-widest">
                  <Activity size={9} /> {t(language, 'usage_history')}
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="created_at" 
                      tickFormatter={(timeStr) => formatTime(new Date(timeStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}))}
                      stroke="rgba(255,255,255,0.2)" fontSize={8} tickLine={false} axisLine={false} dy={8}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', padding: '6px' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                      labelStyle={{ color: 'var(--color-anthropic-subtext)', fontSize: '10px', marginBottom: '2px' }}
                      labelFormatter={(timeStr) => formatTime(new Date(timeStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}))}
                    />
                    <Area 
                      type="monotone" dataKey="usage_percentage" stroke={primaryColor} strokeWidth={2}
                      fillOpacity={1} fill="url(#colorUsage)"
                      activeDot={{ r: 4, fill: '#fff', stroke: primaryColor, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
