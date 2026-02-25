/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  keyMap: {
    playPause: 'Space',
    replay: 'KeyR',
    seekBack: 'ArrowLeft',
    seekForward: 'ArrowRight',
    toggleRecord: 'KeyM',
    addMarker: 'KeyP',
  },
  autoReplay: {
    count: 0,
    interval: 0.5,
  },
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to parse settings', e);
      return DEFAULT_SETTINGS;
    }
  });

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
