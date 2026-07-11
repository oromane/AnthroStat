//! AnthroStat — Rust core (Tauri backend)
//! Minimalist desktop widget to monitor Claude AI usage limits.
//!
//! Author:  Oromane <https://github.com/oromane>
//! Repo:    https://github.com/oromane/AnthroStat
//! License: MIT

/// Auto-detects the Claude `sessionKey` cookie from the user's installed
/// browsers (Chrome, Edge, Brave, Firefox) so the widget can authenticate
/// against Claude's usage API without manual copy/paste.
///
/// Returns the cookie value on success, or a localized error message when
/// no active `claude.ai` session is found.
///
/// AnthroStat — authored by Oromane (https://github.com/oromane)
#[tauri::command]
async fn get_claude_session() -> Result<String, String> {
    let domains = vec!["claude.ai"];
    let mut all_cookies = Vec::new();
    
    if let Ok(c) = rookie::chrome(Some(domains.clone())) { all_cookies.extend(c); }
    if let Ok(c) = rookie::edge(Some(domains.clone())) { all_cookies.extend(c); }
    if let Ok(c) = rookie::brave(Some(domains.clone())) { all_cookies.extend(c); }
    
    if let Ok(Ok(c)) = std::panic::catch_unwind(|| rookie::firefox(Some(domains.clone()))) {
        all_cookies.extend(c);
    }

    for cookie in all_cookies {
        if cookie.name == "sessionKey" {
            return Ok(cookie.value);
        }
    }
    
    Err("Clé de session non trouvée dans vos navigateurs (Chrome, Edge, Brave, Firefox). Veuillez vous connecter à claude.ai sur l'un de ces navigateurs.".to_string())
}

/// Application entry point: builds the Tauri app, registers AnthroStat's
/// commands and plugins (autosta