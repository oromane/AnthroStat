export type SupportedLanguage = 'en' | 'fr' | 'es' | 'pt' | 'ru';

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    app_title: "AnthroStat",
    messages: "Messages",
    reset_at: "Reset At",
    connection_lost: "Connection Lost",
    settings: "Configuration",
    save: "Save Settings",
    session_key: "CLAUDE_SESSION_KEY (Cookie)",
    usage_history: "Usage History",
    alert_threshold: "Alert Threshold (%)",
    language: "Language",
    time_format: "24h Format",
    compact_mode: "Compact Mode"
  },
  fr: {
    app_title: "AnthroStat",
    messages: "Messages",
    reset_at: "Réinitialisation",
    connection_lost: "Connexion Perdue",
    settings: "Configuration",
    save: "Enregistrer",
    session_key: "CLAUDE_SESSION_KEY (Cookie)",
    usage_history: "Historique d'Utilisation",
    alert_threshold: "Seuil d'alerte (%)",
    language: "Langue",
    time_format: "Format 24h",
    compact_mode: "Mode Compact"
  },
  es: {
    app_title: "AnthroStat",
    messages: "Mensajes",
    reset_at: "Reinicio A",
    connection_lost: "Conexión Perdida",
    settings: "Configuración",
    save: "Guardar",
    session_key: "CLAUDE_SESSION_KEY (Cookie)",
    usage_history: "Historial de Uso",
    alert_threshold: "Umbral de Alerta (%)",
    language: "Idioma",
    time_format: "Formato 24h",
    compact_mode: "Modo Compacto"
  },
  pt: {
    app_title: "AnthroStat",
    messages: "Mensagens",
    reset_at: "Reinício Às",
    connection_lost: "Conexão Perdida",
    settings: "Configuração",
    save: "Salvar",
    session_key: "CLAUDE_SESSION_KEY (Cookie)",
    usage_history: "Histórico de Uso",
    alert_threshold: "Limite de Alerta (%)",
    language: "Idioma",
    time_format: "Formato 24h",
    compact_mode: "Modo Compacto"
  },
  ru: {
    app_title: "AnthroStat",
    messages: "Сообщения",
    reset_at: "Сброс в",
    connection_lost: "Соединение потеряно",
    settings: "Настройки",
    save: "Сохранить",
    session_key: "CLAUDE_SESSION_KEY (Cookie)",
    usage_history: "История использования",
    alert_threshold: "Порог предупреждения (%)",
    language: "Язык",
    time_format: "24ч Формат",
    compact_mode: "Компактный Режим"
  }
};

export const t = (lang: SupportedLanguage, key: string): string => {
  return translations[lang]?.[key] || translations['en'][key] || key;
};
