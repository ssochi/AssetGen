import { useEffect, useState } from 'react';

const STORAGE_KEY = 'assetgen.config';

interface LocalConfig {
  apiKey: string;
  authorHandle: string;
}

const defaultValue: LocalConfig = { apiKey: '', authorHandle: '' };

export function useLocalConfig() {
  const [config, setConfig] = useState<LocalConfig>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig({ ...defaultValue, ...JSON.parse(stored) });
      }
      setLoaded(true);
    } catch (error) {
      // ignore corrupted storage
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      // ignore
    }
  }, [config, loaded]);

  return {
    config,
    setConfig,
    loaded,
  };
}
