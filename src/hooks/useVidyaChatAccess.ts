import { useAuth } from '../context/AuthContext';
import { isVidyaEnabledForUser } from '../lib/vidya-access';

/** True when the school's Vidya chatbot is enabled for the signed-in student/teacher. */
export function useVidyaChatAccess(fallbackUser?: { vidyaEnabled?: boolean } | null) {
  const { user: authUser } = useAuth();
  return isVidyaEnabledForUser(fallbackUser ?? authUser);
}
