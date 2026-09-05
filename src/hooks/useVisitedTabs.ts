import { useCallback, useMemo, useState } from 'react';

type Options<T extends string> = {
  /** When set, only the most recently used tabs stay mounted (LRU). */
  maxVisited?: number;
  /** Tabs that are never evicted (e.g. home / overview). */
  pinned?: readonly T[];
};

/** Keep tab screens mounted after first visit so switching tabs stays instant. */
export function useVisitedTabs<T extends string>(initial: T, options?: Options<T>) {
  const maxVisited = options?.maxVisited;
  const pinned = options?.pinned;
  const [active, setActiveState] = useState<T>(initial);
  /** Oldest → newest; used for LRU eviction when maxVisited is set. */
  const [order, setOrder] = useState<T[]>([initial]);

  const visited = useMemo(() => new Set(order), [order]);

  const markVisited = useCallback(
    (id: T) => {
      setOrder((prev) => {
        const next = [...prev.filter((x) => x !== id), id];
        if (!maxVisited || next.length <= maxVisited) return next;

        const pinnedSet = new Set(pinned ?? []);
        // Evict oldest non-pinned tabs until within the budget.
        const trimmed = [...next];
        while (trimmed.length > maxVisited) {
          const evictIdx = trimmed.findIndex((x) => !pinnedSet.has(x));
          if (evictIdx === -1) break;
          trimmed.splice(evictIdx, 1);
        }
        return trimmed;
      });
    },
    [maxVisited, pinned],
  );

  const select = useCallback(
    (id: T) => {
      markVisited(id);
      setActiveState(id);
    },
    [markVisited],
  );

  const setActive = useCallback(
    (id: T) => {
      markVisited(id);
      setActiveState(id);
    },
    [markVisited],
  );

  return { active, visited, select, setActive };
}
