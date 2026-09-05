import { router } from 'expo-router';
import type { ContentTypeName } from './school-program';

export function openDigitalLibraryType(
  type: ContentTypeName | string,
  returnTo?: 'learning'
) {
  router.push({
    pathname: '/asli-prep-content',
    params: {
      type: String(type),
      ...(returnTo ? { returnTo } : {}),
    },
  });
}
