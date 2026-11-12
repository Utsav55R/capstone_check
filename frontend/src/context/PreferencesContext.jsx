import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, translate } from '../i18n/translations';

const THEME_KEY = 'sp_theme';
const LANGUAGE_KEY = 'sp_language';
const THEMES = ['light', 'dark', 'system'];
const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

const readStored = (key, allowed, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the preference still applies for this session.
  }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStored(THEME_KEY, THEMES, 'light'));
  const [language, setLanguageState] = useState(() => readStored(LANGUAGE_KEY, LANGUAGE_CODES, 'en'));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setTheme = useCallback((value) => {
    if (!THEMES.includes(value)) return;
    setThemeState(value);
    writeStored(THEME_KEY, value);
  }, []);

  const setLanguage = useCallback((value) => {
    if (!LANGUAGE_CODES.includes(value)) return;
    setLanguageState(value);
    writeStored(LANGUAGE_KEY, value);
  }, []);

  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, language, setLanguage, t }),
    [theme, resolvedTheme, setTheme, language, setLanguage, t]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
