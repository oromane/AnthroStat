"use client";

/**
 * AnthroStat — main widget UI
 * Renders the usage gauge, live stats, settings panel and history chart.
 *
 * Author:  Oromane <https://github.com/oromane>
 * Repo:    https://github.com/oromane/AnthroStat
 * License: MIT
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { t, SupportedLanguage } from '@/store/translations';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { open } from '@tauri-apps/plugin-shell';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { RefreshCw, PlayCircle, ChevronDown, ChevronUp, Zap, Clock, Activity, Settings, Save, X, Github, MonitorOff, Maximize2, Sparkles, Bell, Power, Minus, Pin, PinOff, AlertCircle } from 'lucide-react';

const GithubIcon = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

const Switch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-anthropic-subtext">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-8 h-4 bg-anthropic-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-anthropic-subtext peer-checked:after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-anthropic-primary"></div>
    </label>
  </div>
);

export default function Home() {
  const { 
    currentData, historicalData, isLoading, error, isExpanded, 
    sessionKey, showSettings, language, alertThreshold, dangerThreshold, use24h, theme, hideFromTaskbar, chartRange,
    enableNotifications, enableAutostart, alwaysOnTop,
    toggleExpanded, toggleSettings, setSessionKey, setLanguage, setTheme, setHideFromTaskbar, setChartRange,
    setAlertThreshold, setDangerThreshold, setUse24h, loadSettings, fetchCurrentData, startPolling,
    setEnableNotifications, setEnableAutostart, setAlwaysOnTop
  } = useAppStore();
  
  const [mounted, setMounted] = useState(false);
  
  // Settings Form State
  const [tempKey, setTempKey] = useState(sessionKey);
  const [tempLang, setTempLang] = useState(language);
  const [tempThresh, setTempThresh] = useState(alertThreshold);
  const [tempDanger, setTempDanger] = useState(dangerThreshold);
  const [temp24h, setTemp24h] = useState(use24h);
  const [tempAutostart, setTempAutostart] = useState(enableAutostart);
  const [tempNotifs, setTempNotifs] = useState(enableNotifications);
  const [tempTheme, setTempTheme] = useState(theme);
  const [tempHideTaskbar, setTempHideTaskbar] = useState(hideFromTaskbar);
  
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    startPolling();
  }, [startPolling]);

  useEffect(() => {
    // Dynamic resize based on settings and expanded state
    try {
      const win = getCurrentWindow();
      if (showSettings) {
        win.setSize(new LogicalSize(420, 560));
      } else {
        win.setSize(new LogicalSize(400, isExpanded ? 480 : 280));
      }
    } catch (e) {
      console.log("Window API not available outside Tauri");
    }
  }, [isExpanded, showSettings]);

  useEffect(() => {
    try {
      getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
    } catch (e) {}
  }, [alwaysOnTop]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTempKey(sessionKey);
    setTempLang(language);
    setTempThresh(alertThreshold);
    setTempDanger(dangerThreshold);
    setTemp24h(use24h);
    setTempTheme(theme);
    setTempHideTaskbar(hideFromTaskbar);
  }, [sessionKey, language, alertThreshold, dangerThreshold, use24h, theme, hideFromTaskbar, showSettings]);

  if (!mounted) return null;

  const percentage = currentData?.usage_percentage || 0;
  
  // Custom warning thresholds logic
  const isAlert = percentage >= alertThreshold;
  const isError = currentData?.status === 'error' || error;
  const primaryColor = (isError || isAlert) ? 'var(--color-anthropic-error)' : 'var(--color-anthropic-primary)';
  
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleSaveSettings = async () => {
    setSessionKey(tempKey);
    setLanguage(tempLang);
    setAlertThreshold(tempThresh);
    setDangerThreshold(tempDanger);
    setUse24h(temp24h);
    setEnableAutostart(tempAutostart);
    setEnableNotifications(tempNotifs);
    setTheme(tempTheme);
    setHideFromTaskbar(tempHideTaskbar);
    toggleSettings();
    try {
      if (tempAutostart) {
        await enable();
      } else {
        await disable();
      }
    } catch (e) {
      console.warn("Autostart not available in dev mode or failed to set.", e);
    }
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const key = await invoke<string>('get_claude_session');
      if (key) {
        setTempKey(key);
        setSessionKey(key);
        toggleSettings();
      }
    } catch (e: any) {
      alert(e.toString());
    } finally {
      setIsDetecting(false);
    }
  };

  const handleLogout = () => {
    setSessionKey("");
    localStorage.removeItem('anthrostat_session_key');
    toggleSettings();
  };

  const formatXAxis = (dateStr: string) => {
    const d = new Date(dateStr);
    const hour = d.getHours();
    
    // We append the exact minute/second invisibly or we just rely on Recharts minTickGap
    // Better yet, just return the hour string, Recharts will distribute them
    if (use24h) {
      return `${hour}h`;
    }
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12} ${suffix}`;
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
              <h1 className="font-bold text-sm tracking-widest text-gradient uppercase">{t(language, 'app_title')}</h1>
            </div>
            
            <div className="flex items-center gap-1">
              <button onClick={() => open("https://github.com/oromane/AnthroStat")} className="text-anthropic-subtext hover:text-anthropic-btn-text transition-all duration-300 p-1.5 rounded-full hover:bg-anthropic-hover" title="Source Code">
                <GithubIcon size={14} />
              </button>
              <button onClick={() => setAlwaysOnTop(!alwaysOnTop)} className={`transition-all duration-300 p-1.5 rounded-full hover:bg-anthropic-hover ${alwaysOnTop ? 'text-anthropic-primary' : 'text-anthropic-subtext hover:text-anthropic-btn-text'}`} title={alwaysOnTop ? t(language, 'always_on_top') + ": ON" : t(language, 'always_on_top') + ": OFF"}>
                {alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
              </button>
              <button onClick={toggleSettings} className="text-anthropic-subtext hover:text-anthropic-btn-text transition-all duration-300 p-1.5 rounded-full hover:bg-anthropic-hover" title={t(language, 'settings')}>
                <Settings size={14} />
              </button>
              <button onClick={toggleExpanded} className="text-anthropic-subtext hover:text-anthropic-btn-text transition-all duration-300 p-1.5 rounded-full hover:bg-anthropic-hover">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button onClick={() => getCurrentWindow().minimize()} className="text-anthropic-btn-text/90 hover:text-anthropic-btn-text transition-all duration-300 p-1.5 rounded-full hover:bg-anthropic-hover ml-1">
                <Minus size={14} />
              </button>
              <button onClick={() => getCurrentWindow().close()} className="text-anthropic-btn-text/90 hover:text-anthropic-error transition-all duration-300 p-1.5 rounded-full hover:bg-anthropic-error/10">
                <X size={14} />
              </button>
            </div>
          </div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />

        {/* Settings Overlay */}
        {showSettings ? (
          <div className="flex-1 flex flex-col p-4 z-20 bg-anthropic-bg animate-in fade-in duration-300 absolute inset-0 overflow-y-auto w-full h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium tracking-tight flex items-center gap-2">
                <Settings size={16} className="text-anthropic-primary" /> {t(language, 'settings')}
              </h2>
              <button onClick={handleSaveSettings} className="bg-anthropic-hover hover:bg-white/20 text-anthropic-btn-text px-3 py-1 rounded text-xs transition-colors">{t(language, 'save')}</button>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              
              {/* API Key Section */}
              <div className="bg-white/5 rounded-lg p-3 border border-anthropic-border">
                <label className="text-[10px] font-semibold text-anthropic-subtext uppercase tracking-wider block mb-2">Session Key</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={tempKey} 
                    onChange={e => setTempKey(e.target.value)}
                    placeholder="sk-ant-sid..."
                    className="flex-1 bg-anthropic-input border border-anthropic-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-anthropic-primary transition-all"
                  />
                  <button 
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="bg-anthropic-primary/20 hover:bg-anthropic-primary text-anthropic-btn-text rounded-md px-2 py-1.5 text-xs font-medium transition-all flex items-center justify-center disabled:opacity-50 border border-anthropic-primary/30"
                    title="Auto-détection depuis votre navigateur"
                  >
                    {isDetecting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  </button>
                </div>
                <div className="text-[9px] text-anthropic-subtext mt-2 leading-relaxed opacity-80">
                  💡 <b>Comment trouver la clé :</b> Allez sur claude.ai &gt; Appuyez sur F12 &gt; Onglet "Application" (ou Stockage) &gt; Cookies &gt; Copiez la valeur de <code>sessionKey</code>. Ou utilisez le bouton ✨ pour l'extraire automatiquement.
                </div>
              </div>

              {/* Grid 2 colonnes pour les options */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                {/* Colonne 1 */}
                <div className="space-y-2">
                  <Switch checked={tempAutostart} onChange={setTempAutostart} label={t(language, 'launch_startup')} />
                  <Switch checked={alwaysOnTop} onChange={setAlwaysOnTop} label={t(language, 'always_on_top')} />
                  
                  <div className="pt-1">
                    <label className="text-[10px] text-anthropic-subtext block mb-1">{t(language, 'theme')}</label>
                    <div className="flex bg-anthropic-input rounded-md p-0.5 border border-anthropic-border">
                      <button onClick={() => setTempTheme('dark')} className={`flex-1 text-[10px] py-1 rounded-sm transition-colors ${tempTheme === 'dark' ? 'bg-anthropic-primary text-anthropic-btn-text' : 'text-anthropic-subtext hover:text-anthropic-btn-text'}`}>{t(language, 'dark')}</button>
                      <button onClick={() => setTempTheme('light')} className={`flex-1 text-[10px] py-1 rounded-sm transition-colors ${tempTheme === 'light' ? 'bg-anthropic-primary text-anthropic-btn-text' : 'text-anthropic-subtext hover:text-anthropic-btn-text'}`}>{t(language, 'light')}</button>
                      <button onClick={() => setTempTheme('system')} className={`flex-1 text-[10px] py-1 rounded-sm transition-colors ${tempTheme === 'system' ? 'bg-anthropic-primary text-anthropic-btn-text' : 'text-anthropic-subtext hover:text-anthropic-btn-text'}`}>{t(language, 'system')}</button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] text-anthropic-subtext block mb-1">{t(language, 'time_format')}</label>
                    <select value={temp24h ? "24h" : "12h"} onChange={(e) => setTemp24h(e.target.value === "24h")} className="w-full bg-anthropic-input border border-anthropic-border rounded-md p-1.5 text-xs text-anthropic-btn-text focus:outline-none">
                      <option value="12h">12h (3:59 PM)</option>
                      <option value="24h">24h (15:59)</option>
                    </select>
                  </div>
                </div>

                {/* Colonne 2 */}
                <div className="space-y-2">
                  <Switch checked={tempHideTaskbar} onChange={setTempHideTaskbar} label={t(language, 'hide_taskbar')} />
                  <Switch checked={tempNotifs} onChange={setTempNotifs} label={t(language, 'usage_alerts')} />
                  
                  <div className="pt-2">
                    <label className="text-[10px] text-anthropic-subtext block mb-1">{t(language, 'warn_at')}</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-orange-400"></span>
                        <input type="number" value={tempThresh} onChange={(e) => setTempThresh(parseInt(e.target.value)||80)} className="w-full bg-anthropic-input border border-anthropic-border rounded-md p-1.5 pl-6 text-xs text-anthropic-btn-text focus:outline-none" min="1" max="100" />
                      </div>
                      <div className="flex-1 relative">
                        <span className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-red-500"></span>
                        <input type="number" value={tempDanger} onChange={(e) => setTempDanger(parseInt(e.target.value)||95)} className="w-full bg-anthropic-input border border-anthropic-border rounded-md p-1.5 pl-6 text-xs text-anthropic-btn-text focus:outline-none" min="1" max="100" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] text-anthropic-subtext block mb-1">{t(language, 'language')}</label>
                    <select value={tempLang} onChange={(e) => setTempLang(e.target.value as SupportedLanguage)} className="w-full bg-anthropic-input border border-anthropic-border rounded-md p-1.5 text-xs text-anthropic-btn-text focus:outline-none">
                      <option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="pt">Português</option><option value="ru">Русский</option>
                    </select>
                  </div>
                </div>
              </div>
              
            </div>
            
            <div className="mt-4 pt-3 border-t border-anthropic-border flex justify-between items-center text-[10px] text-anthropic-subtext">
              <div className="flex items-center gap-3">
                <span>AnthroStat v0.1.0</span>
                <button onClick={handleLogout} className="text-red-400/80 hover:text-red-400 border border-red-400/30 px-2 py-0.5 rounded transition-colors">{t(language, 'log_out')}</button>
              </div>
              <button onClick={() => { try { open("https://www.buymeacoffee.com/oromane"); } catch(e){} }} className="hover:opacity-80 transition-opacity cursor-pointer">
                <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style={{ height: '28px', width: 'auto' }} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Main Data Zone */}
            <div 
              data-tauri-drag-region="false"
              className="flex-1 flex flex-col justify-center items-center z-10 relative group px-8 py-5"
            >
              {isError && !currentData ? (
                <div className="flex flex-col items-center justify-center gap-2 text-anthropic-error animate-float pointer-events-none">
                  <AlertCircle size={32} />
                  <span className="font-semibold text-xs text-center">{t(language, 'connection_lost')}</span>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between">
                  
                  <div className="relative flex items-center justify-center pointer-events-none">
                    <svg 
                      width={96} 
                      height={96} 
                      viewBox="0 0 96 96"
                      className="transform -rotate-90"
                    >
                      <circle cx={48} cy={48} r={radius} stroke="var(--color-anthropic-border)" strokeWidth="6" fill="transparent" />
                      <circle
                        cx={48} cy={48} r={radius} stroke={primaryColor} strokeWidth="6" fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${primaryColor}80)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-extrabold tracking-tighter text-3xl" style={{ color: primaryColor, textShadow: `0 0 10px ${primaryColor}40` }}>
                        {percentage}<span className="text-[10px] text-anthropic-subtext ml-0.5">%</span>
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col gap-3 text-right">
                    <div className="flex flex-col items-end group">
                      <div className="flex items-center gap-1.5 text-anthropic-subtext mb-0.5">
                        <span className="text-[9px] font-medium tracking-wider uppercase">{t(language, 'messages')}</span>
                        <Zap size={9} className="text-yellow-500/70" />
                      </div>
                      <span className="font-bold text-lg leading-none" style={{ color: "var(--color-anthropic-text)" }}>{currentData?.messages_remaining ?? '--'}</span>
                    </div>

                    <div className="flex flex-col items-end group">
                      <div className="flex items-center gap-1.5 text-anthropic-subtext mb-0.5">
                        <span className="text-[9px] font-medium tracking-wider uppercase">{t(language, 'reset_at')}</span>
                        <Clock size={9} className="text-anthropic-primary/70" />
                      </div>
                      <span className="font-semibold text-xs" style={{ color: "var(--color-anthropic-text)", opacity: 0.9 }}>{currentData?.limit_reset_time ?? '--:--'}</span>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-anthropic-subtext mb-0.5">
                        <span className="text-[9px] font-medium tracking-wider uppercase">Weekly</span>
                      </div>
                      <span className="font-semibold text-xs" style={{ color: "var(--color-anthropic-text)", opacity: 0.9 }}>{currentData?.weekly_percentage ?? 0}%</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Expandable History Graph */}
            {(historicalData.length > 0) && (
              <div className="w-full mt-auto border-t border-anthropic-border pt-4 pb-2 transition-all duration-500">
                <div className="w-full flex items-center justify-between group">
                  <button 
                    onClick={toggleExpanded}
                    className="flex items-center gap-2 text-xs text-anthropic-subtext hover:text-anthropic-btn-text transition-colors"
                  >
                    <Activity size={14} className="group-hover:text-anthropic-primary transition-colors" />
                    <span className="uppercase tracking-wider font-semibold">{t(language, 'usage_history')}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isExpanded && (
                    <div className="flex bg-anthropic-input rounded border border-anthropic-border p-0.5 gap-0.5 animate-in fade-in">
                      {(['1h', '5h', '1d', '1w'] as const).map(range => (
                        <button 
                          key={range}
                          onClick={() => setChartRange(range)}
                          className={`text-[9px] px-2 py-0.5 rounded transition-colors ${chartRange === range ? 'bg-anthropic-primary text-anthropic-btn-text font-medium' : 'text-anthropic-subtext hover:text-anthropic-btn-text hover:bg-white/5'}`}
                        >
                          {t(language, `history_${range}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {isExpanded && (
                  <div className="mt-4 h-[120px] w-full animate-in fade-in slide-in-from-top-2 duration-500">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="created_at" 
                          tickFormatter={formatXAxis} 
                          stroke="#ffffff40" 
                          fontSize={10} 
                          tickMargin={8} 
                          minTickGap={30}
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          tick={{fontSize: 9, fill: '#807e7b'}} 
                          axisLine={false} 
                          tickLine={false} 
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          labelStyle={{ color: 'var(--color-anthropic-subtext)', fontSize: '10px', marginBottom: '2px' }}
                          formatter={(value: number) => [`${value}%`, 'Session']}
                          labelFormatter={(label) => new Date(label).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { hour12: !use24h })}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="weekly_percentage" 
                          stroke="#555" 
                          strokeWidth={1} 
                          strokeDasharray="3 3"
                          fillOpacity={0} 
                          activeDot={false}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="usage_percentage" 
                          stroke={primaryColor} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorUsage)" 
                          activeDot={{ r: 4, fill: '#fff', stroke: primaryColor, strokeWidth: 2 }}
        