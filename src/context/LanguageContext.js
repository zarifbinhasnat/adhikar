import React, { createContext, useContext, useState, useMemo } from 'react';
import { getStrings } from '../constants/strings';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('EN');
  const toggleLanguage = () => setLanguage((p) => (p === 'EN' ? 'BN' : 'EN'));

  const value = useMemo(() => ({
    language,
    strings: getStrings(language),
    toggleLanguage,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
