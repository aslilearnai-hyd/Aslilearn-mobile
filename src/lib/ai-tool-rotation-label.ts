type RenderKeyMeta = { selectedIndex?: number } | null | undefined;

export function simpleContentFingerprint(text: string): string {
  let hash = 0;
  const value = String(text || '');
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return `${hash.toString(36)}-${value.length}`;
}

export function buildAiToolContentRenderKey(
  toolType: string,
  content: string,
  meta?: RenderKeyMeta
): string {
  const idx = meta?.selectedIndex ?? -1;
  return `${toolType}:${idx}:${simpleContentFingerprint(content)}`;
}

