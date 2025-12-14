import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Globe } from 'lucide-react';
import Analytics from '@/lib/analytics';
import { toast } from 'sonner';

export interface Language {
  code: string;
  name: string;
}

// ISO 639-1 language codes supported by Whisper
const LANGUAGES: Language[] = [
  { code: 'auto', name: 'Automatisch (Originalsprache)' },
  { code: 'auto-translate', name: 'Automatisch (ins Englische übersetzen)' },
  { code: 'en', name: 'Englisch' },
  { code: 'zh', name: 'Chinesisch' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Spanisch' },
  { code: 'ru', name: 'Russisch' },
  { code: 'ko', name: 'Koreanisch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'ja', name: 'Japanisch' },
  { code: 'pt', name: 'Portugiesisch' },
  { code: 'tr', name: 'Türkisch' },
  { code: 'pl', name: 'Polnisch' },
  { code: 'ca', name: 'Katalanisch' },
  { code: 'nl', name: 'Niederländisch' },
  { code: 'ar', name: 'Arabisch' },
  { code: 'sv', name: 'Schwedisch' },
  { code: 'it', name: 'Italienisch' },
  { code: 'id', name: 'Indonesisch' },
  { code: 'hi', name: 'Hindi' },
  { code: 'fi', name: 'Finnisch' },
  { code: 'vi', name: 'Vietnamesisch' },
  { code: 'he', name: 'Hebräisch' },
  { code: 'uk', name: 'Ukrainisch' },
  { code: 'el', name: 'Griechisch' },
  { code: 'ms', name: 'Malaiisch' },
  { code: 'cs', name: 'Tschechisch' },
  { code: 'ro', name: 'Rumänisch' },
  { code: 'da', name: 'Dänisch' },
  { code: 'hu', name: 'Ungarisch' },
  { code: 'ta', name: 'Tamil' },
  { code: 'no', name: 'Norwegisch' },
  { code: 'th', name: 'Thailändisch' },
  { code: 'ur', name: 'Urdu' },
  { code: 'hr', name: 'Kroatisch' },
  { code: 'bg', name: 'Bulgarisch' },
  { code: 'lt', name: 'Litauisch' },
  { code: 'la', name: 'Latein' },
  { code: 'mi', name: 'Maori' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'cy', name: 'Walisisch' },
  { code: 'sk', name: 'Slowakisch' },
  { code: 'te', name: 'Telugu' },
  { code: 'fa', name: 'Persisch' },
  { code: 'lv', name: 'Lettisch' },
  { code: 'bn', name: 'Bengalisch' },
  { code: 'sr', name: 'Serbisch' },
  { code: 'az', name: 'Aserbaidschanisch' },
  { code: 'sl', name: 'Slowenisch' },
  { code: 'kn', name: 'Kannada' },
  { code: 'et', name: 'Estnisch' },
  { code: 'mk', name: 'Mazedonisch' },
  { code: 'br', name: 'Bretonisch' },
  { code: 'eu', name: 'Baskisch' },
  { code: 'is', name: 'Isländisch' },
  { code: 'hy', name: 'Armenisch' },
  { code: 'ne', name: 'Nepalesisch' },
  { code: 'mn', name: 'Mongolisch' },
  { code: 'bs', name: 'Bosnisch' },
  { code: 'kk', name: 'Kasachisch' },
  { code: 'sq', name: 'Albanisch' },
  { code: 'sw', name: 'Suaheli' },
  { code: 'gl', name: 'Galicisch' },
  { code: 'mr', name: 'Marathi' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'si', name: 'Singhalesisch' },
  { code: 'km', name: 'Khmer' },
  { code: 'sn', name: 'Shona' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'so', name: 'Somali' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'oc', name: 'Okzitanisch' },
  { code: 'ka', name: 'Georgisch' },
  { code: 'be', name: 'Belarussisch' },
  { code: 'tg', name: 'Tadschikisch' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'am', name: 'Amharisch' },
  { code: 'yi', name: 'Jiddisch' },
  { code: 'lo', name: 'Lao' },
  { code: 'uz', name: 'Usbekisch' },
  { code: 'fo', name: 'Färöisch' },
  { code: 'ht', name: 'Haitianisches Kreolisch' },
  { code: 'ps', name: 'Paschtu' },
  { code: 'tk', name: 'Turkmenisch' },
  { code: 'nn', name: 'Norwegisch (Nynorsk)' },
  { code: 'mt', name: 'Maltesisch' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'lb', name: 'Luxemburgisch' },
  { code: 'my', name: 'Birmanisch (Myanmar)' },
  { code: 'bo', name: 'Tibetisch' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'mg', name: 'Madagassisch' },
  { code: 'as', name: 'Assamesisch' },
  { code: 'tt', name: 'Tatarisch' },
  { code: 'haw', name: 'Hawaiianisch' },
  { code: 'ln', name: 'Lingala' },
  { code: 'ha', name: 'Hausa' },
  { code: 'ba', name: 'Baschkirisch' },
  { code: 'jw', name: 'Javanisch' },
  { code: 'su', name: 'Sundanesisch' },
];

interface LanguageSelectionProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  disabled?: boolean;
  provider?: 'localWhisper' | 'parakeet' | 'deepgram' | 'elevenLabs' | 'groq' | 'openai';
}

export function LanguageSelection({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
  provider = 'localWhisper'
}: LanguageSelectionProps) {
  const [saving, setSaving] = useState(false);

  // Parakeet only supports auto-detection (doesn't support manual language selection)
  const isParakeet = provider === 'parakeet';
  const availableLanguages = isParakeet
    ? LANGUAGES.filter(lang => lang.code === 'auto' || lang.code === 'auto-translate')
    : LANGUAGES;

  const handleLanguageChange = async (languageCode: string) => {
    setSaving(true);
    try {
      // Save language preference to backend
      await invoke('set_language_preference', { language: languageCode });
      onLanguageChange(languageCode);
      console.log('Language preference saved:', languageCode);

      // Track language selection analytics
      const selectedLang = LANGUAGES.find(lang => lang.code === languageCode);
      await Analytics.track('language_selected', {
        language_code: languageCode,
        language_name: selectedLang?.name || 'Unbekannt',
        is_auto_detect: (languageCode === 'auto').toString(),
        is_auto_translate: (languageCode === 'auto-translate').toString()
      });

      // Show success toast
      const languageName = selectedLang?.name || languageCode;
      toast.success("Spracheinstellung gespeichert", {
        description: `Transkriptionssprache: ${languageName}`
      });
    } catch (error) {
      console.error('Failed to save language preference:', error);
      toast.error("Spracheinstellung konnte nicht gespeichert werden", {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setSaving(false);
    }
  };

  // Find the selected language name for display
  const selectedLanguageName = LANGUAGES.find(
    lang => lang.code === selectedLanguage
  )?.name || 'Automatisch (Originalsprache)';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Transkriptionssprache</h4>
        </div>
      </div>

      <div className="space-y-2">
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={disabled || saving}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        >
          {availableLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
              {language.code !== 'auto' && language.code !== 'auto-translate' && ` (${language.code})`}
            </option>
          ))}
        </select>

        {/* Parakeet language limitation warning */}
        {isParakeet && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
            <p className="font-medium">ℹ️ Parakeet: Sprachunterstützung</p>
            <p className="mt-1 text-xs">Parakeet unterstützt aktuell nur die automatische Spracherkennung. Eine manuelle Sprachauswahl ist nicht verfügbar. Nutze Whisper, wenn du eine bestimmte Sprache festlegen möchtest.</p>
          </div>
        )}

        {/* Info text */}
        <div className="text-xs space-y-2 pt-2">
          <p className="text-gray-600">
            <strong>Aktuell:</strong> {selectedLanguageName}
          </p>
          {selectedLanguage === 'auto' && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <p className="font-medium">⚠️ Automatische Erkennung kann ungenau sein</p>
              <p className="mt-1">Für beste Genauigkeit wähle deine Sprache (z. B. Deutsch, Englisch, …)</p>
            </div>
          )}
          {selectedLanguage === 'auto-translate' && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
              <p className="font-medium">🌐 Übersetzungsmodus aktiv</p>
              <p className="mt-1">Das Audio wird automatisch ins Englische übersetzt. Sinnvoll für mehrsprachige Meetings, wenn du englische Ausgabe benötigst.</p>
            </div>
          )}
          {selectedLanguage !== 'auto' && selectedLanguage !== 'auto-translate' && (
            <p className="text-gray-600">
              Transkription wird optimiert für <strong>{selectedLanguageName}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
