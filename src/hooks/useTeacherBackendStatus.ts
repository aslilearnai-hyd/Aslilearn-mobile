import { useCallback, useEffect, useState } from 'react';
import teacherService, { type BackendStatus } from '../services/api/teacherService';

export function useTeacherBackendStatus(autoCheck = true) {
  const [status, setStatus] = useState<BackendStatus>('online');
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const next = await teacherService.checkBackendStatus();
      setStatus(next);
      return next;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) refresh();
  }, [autoCheck, refresh]);

  return { status, checking, refresh, isOnline: status === 'online', isCached: status === 'cached', isOffline: status === 'offline' };
}
