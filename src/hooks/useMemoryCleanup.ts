import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { runMemoryCleanup } from '../lib/memory-cleanup';

/**
 * Evicts image / query / ephemeral caches when the app leaves the foreground
 * so mounted dashboards and expo-image do not retain more memory than needed.
 */
export function useMemoryCleanup() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const running = useRef(false);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      const leftForeground =
        (prev === 'active' || prev === 'inactive') &&
        (next === 'background' || (Platform.OS === 'ios' && next === 'inactive'));

      if (!leftForeground || running.current) return;

      running.current = true;
      // Aggressive on true background; soft when iOS only moves to inactive (control center, etc.).
      const level = next === 'background' ? 'aggressive' : 'soft';
      void runMemoryCleanup(level).finally(() => {
        running.current = false;
      });
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
