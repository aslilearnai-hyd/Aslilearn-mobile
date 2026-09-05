import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { isIndividualAccount } from '../../lib/individual-signup';

/** School-only student routes (timetable, OMR, homework, teacher diary). */
export function isSchoolOnlyStudentPath(pathname: string) {
  return (
    pathname.startsWith('/teachers-report') ||
    pathname.startsWith('/assignments') ||
    pathname.startsWith('/student/results') ||
    pathname.startsWith('/student/timetable') ||
    pathname.startsWith('/student/homework')
  );
}

/**
 * B2C / individual students have no school. Mirror web `SchoolOnlyGuard`:
 * send them to the dashboard instead of an empty school screen.
 */
export function useSchoolOnlyGuard() {
  const router = useRouter();
  const { user } = useAuth();
  const blocked = isIndividualAccount(user);

  useEffect(() => {
    if (blocked) router.replace('/dashboard');
  }, [blocked, router]);

  return blocked;
}
