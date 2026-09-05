import { extractYouTubeId, getYoutubeEmbedUrl } from './contentPreview';

export type LiveSessionPlaybackSource = {
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
  playbackUrl?: string;
  hlsUrl?: string;
};

function ensureLiveEmbedParams(embedUrl: string): string {
  try {
    const parsed = new URL(embedUrl);
    parsed.searchParams.set('fs', '1');
    parsed.searchParams.set('playsinline', '1');
    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('rel', '0');
    parsed.searchParams.set('modestbranding', '1');
    return parsed.toString();
  } catch {
    const joiner = embedUrl.includes('?') ? '&' : '?';
    return `${embedUrl}${joiner}fs=1&playsinline=1&autoplay=1&rel=0&modestbranding=1`;
  }
}

/** Resolve a YouTube embed URL for live session WebView playback. */
export function resolveLiveSessionEmbedUrl(session: LiveSessionPlaybackSource): string | null {
  if (session.youtubeEmbedUrl?.trim()) {
    return ensureLiveEmbedParams(session.youtubeEmbedUrl.trim());
  }

  const candidates = [
    session.youtubeUrl,
    session.playbackUrl,
    session.hlsUrl,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const candidate of candidates) {
    const embed = getYoutubeEmbedUrl(candidate, { autoplay: true });
    if (embed) return embed;
    if (/youtube|youtu\.be/i.test(candidate) && extractYouTubeId(candidate)) {
      const id = extractYouTubeId(candidate)!;
      return getYoutubeEmbedUrl(`https://www.youtube.com/watch?v=${id}`, { autoplay: true });
    }
  }

  return null;
}
