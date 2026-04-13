import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 500;
const validAddressPattern = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?$/;

const inferLevel = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) {
    return 'error';
  }

  if (lower.includes('warn')) {
    return 'warn';
  }

  return 'info';
};

export default function useRokuTelnetLogs(deviceAddress, onLogs, onStatus) {
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const handleBatch = (batch) => {
      if (!Array.isArray(batch) || batch.length === 0) {
        return;
      }

      const normalized = batch
        .map((entry) => {
          const text = typeof entry?.text === 'string' ? entry.text.trimEnd() : '';
          if (!text) {
            return null;
          }

          const ts = typeof entry?.ts === 'number' ? entry.ts : Date.now();
          return {
            text,
            ts,
            level: inferLevel(text),
          };
        })
        .filter(Boolean);

      if (normalized.length > 0) {
        onLogs?.(normalized);
      }
    };

    const handleStatus = (status) => {
      onStatus?.(status);
    };

    window.electronAPI.onRokuLogBatch(handleBatch);
    window.electronAPI.onRokuLogStatus(handleStatus);

    return () => {
      window.electronAPI.removeListener('roku-log-batch');
      window.electronAPI.removeListener('roku-log-status');
    };
  }, [onLogs, onStatus]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmed = (deviceAddress || '').trim();
      if (!trimmed || !validAddressPattern.test(trimmed)) {
        window.electronAPI.stopRokuLogs().catch(() => {});
        return;
      }

      window.electronAPI.setRokuLogSource(trimmed).catch(() => {});
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [deviceAddress]);

  useEffect(() => {
    return () => {
      window.electronAPI.stopRokuLogs().catch(() => {});
    };
  }, []);
}
