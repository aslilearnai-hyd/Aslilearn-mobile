import { useMemo } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Katex from 'react-native-katex';

type Props = { text: string; style?: TextStyle | TextStyle[] };

const HAS_MATH = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/;
const MATH_SEGMENTS = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;

function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([{}%#&_])/g, '\\$1')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}')
    .replace(/\s+/g, ' ');
}

function mixedTextToKatex(value: string) {
  return value.split(MATH_SEGMENTS).filter(Boolean).map((part) => {
    const delimited =
      (part.startsWith('$') && part.endsWith('$')) ||
      (part.startsWith('\\(') && part.endsWith('\\)')) ||
      (part.startsWith('\\[') && part.endsWith('\\]'));
    if (!delimited) return `\\text{${escapeText(part)}}`;
    return part.startsWith('$')
      ? part.replace(/^\$\$?/, '').replace(/\$\$?$/, '')
      : part.slice(2, -2);
  }).join('');
}

export default function ExamMathText({ text, style }: Props) {
  const value = String(text || '');
  const expression = useMemo(() => mixedTextToKatex(value), [value]);
  if (!HAS_MATH.test(value)) return <Text style={style}>{value}</Text>;
  return (
    <View style={styles.container}>
      <Katex
        expression={expression}
        displayMode={false}
        throwOnError={false}
        scrollEnabled={false}
        style={styles.katex}
        inlineStyle={KATEX_STYLE}
      />
    </View>
  );
}

const KATEX_STYLE = `
html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
body { display: flex; align-items: center; }
.katex { color: #111827; font-size: 1.05em; white-space: normal; line-height: 1.55; }
`;

const styles = StyleSheet.create({
  container: { minHeight: 46, flexGrow: 1 },
  katex: { minHeight: 46, backgroundColor: 'transparent' },
});
