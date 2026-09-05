import AsyncStorage from '@react-native-async-storage/async-storage';

export const CURRICULUM_CLASSES_STORAGE_KEY = 'superAdminCurriculumClasses';

export type CurriculumClassEntry = {
  classNumber: string;
  description: string;
  label: string;
};

function parseStored(raw: string | null): CurriculumClassEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CurriculumClassEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CurriculumClassEntry).classNumber === 'string' &&
        typeof (item as CurriculumClassEntry).label === 'string'
    );
  } catch {
    return [];
  }
}

export async function loadCurriculumClasses(): Promise<CurriculumClassEntry[]> {
  const raw = await AsyncStorage.getItem(CURRICULUM_CLASSES_STORAGE_KEY);
  return parseStored(raw);
}

export async function saveCurriculumClass(entry: CurriculumClassEntry): Promise<boolean> {
  const existing = await loadCurriculumClasses();
  if (existing.some((c) => c.classNumber === entry.classNumber)) {
    return false;
  }
  await AsyncStorage.setItem(
    CURRICULUM_CLASSES_STORAGE_KEY,
    JSON.stringify([...existing, entry])
  );
  return true;
}

export function classNumberFromLabel(value: string): number {
  const digits = String(value || '').replace(/\D/g, '');
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

export function compareClassLabels(a: string, b: string): number {
  const aNum = classNumberFromLabel(a);
  const bNum = classNumberFromLabel(b);
  if (aNum !== bNum) return aNum - bNum;
  return a.localeCompare(b);
}

export async function getCurriculumClassLabels(): Promise<string[]> {
  const entries = await loadCurriculumClasses();
  return [...entries.map((c) => c.label)].sort(compareClassLabels);
}
