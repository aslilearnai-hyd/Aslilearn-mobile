/** Remove markdown markers so AI tool content reads as normal plain text. */
export function stripMarkdownSyntax(text: string): string {
  let s = String(text || '').replace(/\r\n/g, '\n');

  for (let i = 0; i < 6; i += 1) {
    const prev = s;
    s = s
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/__(.*?)__/gs, '$1')
      .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '$1')
      .replace(/(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g, '$1');
    if (s === prev) break;
  }

  s = s.replace(/\*\*/g, '').replace(/__/g, '');

  s = s
    .split('\n')
    .map((line) => {
      let l = line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/^[-*+]\s+/, '• ')
        .replace(/`+/g, '');
      l = l.replace(/^\*+\s*/, '').replace(/\s*\*+$/, '');
      return l.trimEnd();
    })
    .join('\n');

  return s
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
