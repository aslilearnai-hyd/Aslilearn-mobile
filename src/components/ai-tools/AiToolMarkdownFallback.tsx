import { View, StyleSheet } from 'react-native';
import AiToolWebView from './AiToolWebView';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
  fill?: boolean;
};

/** Same markdown fallback path web viewers use when structured parse is incomplete. */
export default function AiToolMarkdownFallback({
  toolType,
  content,
  rawContent,
  variant = 'student',
  fill = false,
}: Props) {
  return (
    <View style={[styles.wrap, fill && styles.fill]}>
      <AiToolWebView
        toolType={toolType}
        content={content}
        rawContent={rawContent}
        variant={variant}
        fill={fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 18, overflow: 'hidden' },
  fill: { flex: 1, minHeight: 0 },
});
