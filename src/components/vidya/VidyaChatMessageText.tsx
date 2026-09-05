import { Platform, Text, StyleSheet, View, type TextStyle } from 'react-native';

/**
 * Same structure cleanup as web ChatMessageContent.normalizeChatStructure —
 * makes flat Vidya replies readable without changing meaning.
 */
export function normalizeChatStructure(raw: string): string {
  if (!raw) return '';
  let text = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  text = text.replace(/\s*---+\s*/g, '\n\n');
  text = text.replace(/([a-z.!?)])\s+(\d{1,2})\.\s+(\*{0,2}[A-Z])/g, '$1\n\n$2. $3');
  text = text.replace(/([^\n])\s+[•●]\s+/g, '$1\n• ');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*]\s+/gm, '• ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

type Props = {
  text: string;
  style?: TextStyle | TextStyle[];
  /** User bubbles use light text on blue */
  tone?: 'assistant' | 'user';
};

/**
 * Trailing width buffer — Android (esp. OEM fonts / Android 15+ glyph bounds)
 * under-measures hug-fit bubbles and clips the last glyph ("Hello" → "Hell").
 * Hair space (\u200A) is too thin on many devices; NBSP is reliable.
 */
const CLIP_GUARD = Platform.OS === 'android' ? '\u00A0\u00A0' : '\u00A0';

/**
 * Renders full assistant/user text with correct wrapping on Android.
 * Avoids clipped last glyphs/lines and phantom empty bubble height.
 */
export function VidyaChatMessageText({ text, style, tone = 'assistant' }: Props) {
  const normalized = normalizeChatStructure(text);
  if (!normalized) {
    return (
      <Text style={[styles.base, tone === 'user' && styles.user, style]}>
        …
      </Text>
    );
  }

  const blocks = normalized.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <View style={styles.wrap}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
        return (
          <View key={`b-${bi}`} style={bi > 0 ? styles.blockGap : undefined}>
            {lines.map((line, li) => (
              <Text
                key={`l-${bi}-${li}`}
                style={[
                  styles.base,
                  tone === 'user' && styles.user,
                  li > 0 && styles.lineGap,
                  style,
                ]}
                textBreakStrategy="simple"
                android_hyphenationFrequency="none"
              >
                {line}
                {CLIP_GUARD}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Hug content (not stretch) so bubble padding stays outside the measured text.
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minWidth: 0,
    // Extra ink room for glyphs that overhang advance width (Android 15+).
    paddingRight: Platform.OS === 'android' ? 6 : 2,
  },
  blockGap: {
    marginTop: 8,
  },
  lineGap: {
    marginTop: 4,
  },
  base: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1e293b',
    // flexShrink causes Android to clip the last glyph inside tight bubbles
  },
  user: {
    color: '#fff',
  },
});

export default VidyaChatMessageText;
