import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type EduOTTFilterState = {
  selectedClass: string | null;
  selectedSubject: string | null;
};

type EduOTTFilterContextValue = EduOTTFilterState & {
  setSelectedClass: (value: string | null) => void;
  setSelectedSubject: (value: string | null) => void;
  clearFilters: () => void;
  clearClass: () => void;
  clearSubject: () => void;
  listEpoch: number;
};

const EduOTTFilterContext = createContext<EduOTTFilterContextValue | null>(null);

const ALL = '__all__';

export function eduottClassToSelectValue(c: string | null): string {
  return c == null || c === '' ? ALL : c;
}

export function eduottSelectValueToClass(v: string): string | null {
  return v === ALL ? null : v;
}

export function EduOTTFilterProvider({ children }: { children: ReactNode }) {
  const [selectedClass, setSelectedClassState] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubjectState] = useState<string | null>(null);
  const [listEpoch, setListEpoch] = useState(0);
  const prevClassRef = useRef<string | null>(null);

  const bump = useCallback(() => setListEpoch((e) => e + 1), []);

  const setSelectedClass = useCallback(
    (value: string | null) => {
      if (prevClassRef.current !== value) {
        setSelectedSubjectState(null);
      }
      prevClassRef.current = value;
      setSelectedClassState(value);
      bump();
    },
    [bump]
  );

  const setSelectedSubject = useCallback(
    (value: string | null) => {
      setSelectedSubjectState(value);
      bump();
    },
    [bump]
  );

  const clearFilters = useCallback(() => {
    prevClassRef.current = null;
    setSelectedClassState(null);
    setSelectedSubjectState(null);
    bump();
  }, [bump]);

  const clearClass = useCallback(() => {
    prevClassRef.current = null;
    setSelectedClassState(null);
    setSelectedSubjectState(null);
    bump();
  }, [bump]);

  const clearSubject = useCallback(() => {
    setSelectedSubjectState(null);
    bump();
  }, [bump]);

  const value = useMemo<EduOTTFilterContextValue>(
    () => ({
      selectedClass,
      selectedSubject,
      setSelectedClass,
      setSelectedSubject,
      clearFilters,
      clearClass,
      clearSubject,
      listEpoch,
    }),
    [
      selectedClass,
      selectedSubject,
      setSelectedClass,
      setSelectedSubject,
      clearFilters,
      clearClass,
      clearSubject,
      listEpoch,
    ]
  );

  return (
    <EduOTTFilterContext.Provider value={value}>
      {children}
    </EduOTTFilterContext.Provider>
  );
}

export function useEduOTTFilters(): EduOTTFilterContextValue {
  const ctx = useContext(EduOTTFilterContext);
  if (!ctx) {
    throw new Error('useEduOTTFilters must be used within EduOTTFilterProvider');
  }
  return ctx;
}

export function useEduOTTFiltersOptional(): EduOTTFilterContextValue | null {
  return useContext(EduOTTFilterContext);
}
