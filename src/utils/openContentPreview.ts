import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import {
  getPreviewKind,
  isYouTubeUrl,
  resolveContentUrl,
  unwrapNestedFileUrl,
} from './contentPreview';

type ContentLike = {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
  topic?: string;
  chapter?: string;
  module?: string;
  fileUrl?: string;
  fileUrls?: string[];
  youtubeUrl?: string;
  driveLink?: string;
  videoUrl?: string;
};

import type { ContentReturnTarget } from '../hooks/useBackNavigation';

export function openContentPreview(
  router: Router,
  item: ContentLike,
  options?: { returnTo?: ContentReturnTarget }
) {
  const rawUrl = unwrapNestedFileUrl(
    item.fileUrls?.[0] ||
      item.fileUrl ||
      item.videoUrl ||
      item.driveLink ||
      item.youtubeUrl ||
      '',
  );
  const resolvedUrl = resolveContentUrl(rawUrl);
  const contentId = item._id || item.id;
  const returnParams = options?.returnTo ? { returnTo: options.returnTo } : {};
  const kind = getPreviewKind(resolvedUrl, item.type, item.youtubeUrl);

  /** Native player for YouTube/Drive/mp4 videos — not PDFs/audio mis-tagged as Video. */
  const isVideoType = item.type === 'Video' || item.type === 'video';
  const useVideoPlayer =
    kind === 'youtube' ||
    (isVideoType && (kind === 'video' || kind === 'drive' || kind === 'unknown'));

  if (useVideoPlayer && (resolvedUrl || item.youtubeUrl)) {
    const playableUrl = resolvedUrl || item.youtubeUrl || '';
    const contentPayload = {
      _id: contentId || 'preview',
      title: item.title || item.topic || 'Video',
      topic: item.topic,
      chapter: item.chapter,
      module: item.module,
      fileUrl: playableUrl,
      youtubeUrl: item.youtubeUrl || (isYouTubeUrl(playableUrl) ? playableUrl : ''),
      videoUrl: playableUrl,
      driveLink: item.driveLink,
      type: item.type || 'Video',
    };
    router.push({
      pathname: '/video-player',
      params: {
        videoId: String(contentId || 'preview'),
        isContentItem: 'true',
        contentData: JSON.stringify(contentPayload),
        ...returnParams,
      },
    });
    return;
  }

  const link = item.driveLink || rawUrl;
  if (!link) {
    Alert.alert('Content', item.title || 'No preview available for this item.');
    return;
  }

  router.push({
    pathname: '/drive-viewer',
    params: {
      driveLink: encodeURIComponent(link),
      title: item.title || 'Preview',
      contentType: item.type || '',
      ...returnParams,
    },
  });
}
