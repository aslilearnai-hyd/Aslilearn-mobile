import { View, Text, StyleSheet } from 'react-native';

interface MathRendererProps {
  formula: string;
  inline?: boolean;
  style?: any;
}

export default function MathRenderer({ formula, inline = false, style }: MathRendererProps) {
  // For React Native, we'll use a simple text-based approach
  // For full KaTeX support, you'd need to use WebView or a native module
  // This is a simplified version that displays the formula
  
  // Clean the formula (remove LaTeX delimiters for display)
  const displayFormula = formula
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\$/g, '');

  if (inline) {
    return (
      <Text style={[styles.inlineFormula, style]}>
        {displayFormula}
      </Text>
    );
  }

  return (
    <View style={[styles.blockFormula, style]}>
      <Text style={styles.formulaText}>{displayFormula}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineFormula: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockFormula: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  formulaText: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
  },
});

