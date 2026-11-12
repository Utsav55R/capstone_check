import en from './locales/en';
import hi from './locales/hi';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

// To add a language: create locales/<code>.js with the same keys as en.js, register it
// below, and add <code> to SUPPORTED_LANGUAGES in backend/app/schemas.py.
export const LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', locale: 'en-IN' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', locale: 'es-ES' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', locale: 'fr-FR' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', locale: 'de-DE' },
];

const DICTIONARIES = { en, hi, es, fr, de };

export const localeFor = (language) => LANGUAGES.find((l) => l.code === language)?.locale || 'en-IN';

// Looks up `key` in the active language, falling back to English and finally the key itself.
// `{name}` placeholders are filled from `vars`.
export function translate(language, key, vars) {
  const template = DICTIONARIES[language]?.[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
}
