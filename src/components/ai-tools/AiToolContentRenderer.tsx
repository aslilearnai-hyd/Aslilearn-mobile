import { useMemo } from 'react';
import { resolveInteractiveAiToolViewer } from './ResolveInteractiveAiToolViewer';
import AiToolWebView from './AiToolWebView';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { coalesceAiToolRawContent } from '../../lib/ai-tool-display-content';
import { resolveAiToolDisplayType } from '../../lib/ai-tool-generate';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  accent?: string;
  variant?: 'student' | 'teacher';
  /** Phone result layout: child owns vertical scroll instead of parent page ScrollView. */
  fill?: boolean;
};

export default function AiToolContentRenderer({
  toolType,
  content,
  rawContent,
  variant = 'student',
  fill = false,
}: Props) {
  const displayToolType = useMemo(
    () => resolveAiToolDisplayType(toolType, variant),
    [toolType, variant],
  );

  const cleaned = useMemo(() => stripStructuredAiToolMetadata(content), [content]);
  const mergedRaw = useMemo(
    () => coalesceAiToolRawContent(cleaned, rawContent),
    [cleaned, rawContent],
  );

  const interactive = resolveInteractiveAiToolViewer({
    toolType: displayToolType,
    content: cleaned,
    rawContent: mergedRaw,
    audience: variant,
    fill,
  });
  if (interactive) return interactive;

  return (
    <AiToolWebView
      toolType={displayToolType}
      content={cleaned}
      rawContent={mergedRaw}
      variant={variant}
      fill={fill}
    />
  );
}
