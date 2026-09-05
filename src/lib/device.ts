import { Dimensions, Platform } from 'react-native';

function androidUiModeLooksLikeTv(): boolean {
  const uiMode = String((Platform as any).constants?.uiMode || '').toLowerCase();
  return uiMode.includes('television') || uiMode.split('|').includes('tv');
}

/** Classroom panels / TOUCHLINE often report as a large Android tablet, not leanback. */
function isLargeAndroidPanel(): boolean {
  try {
    const { width, height } = Dimensions.get('screen');
    if (!width || !height) return true;
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    const landscape = width >= height;
    return landscape && shortSide >= 500 && longSide >= 900;
  } catch {
    return true;
  }
}

/** Android TV, leanback boxes, and large classroom TV panels. */
export function isAndroidTv(): boolean {
  if (Platform.OS !== 'android') return false;
  return Platform.isTV === true || androidUiModeLooksLikeTv() || isLargeAndroidPanel();
}
