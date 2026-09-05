import { formatPersonName } from './teacher-text';

type StudentUserLike = {
  fullName?: string;
  name?: string;
  email?: string;
};

/** First name for greetings — e.g. ANUPOJU → Anupoju */
export function resolveStudentFirstName(user?: StudentUserLike | null): string {
  const raw =
    user?.fullName?.trim().split(/\s+/)[0] ||
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0]?.trim() ||
    'Student';
  return formatPersonName(raw);
}

/** Full display name — e.g. ANUPOJU KUMAR → Anupoju Kumar */
export function resolveStudentDisplayName(user?: StudentUserLike | null): string {
  const raw = user?.fullName?.trim() || user?.name?.trim() || user?.email?.split('@')[0]?.trim() || 'Student';
  return formatPersonName(raw);
}
