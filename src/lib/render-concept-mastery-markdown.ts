import { resolveRichDisplayContent, coalesceAiToolRawContent } from './ai-tool-display-content';
import { renderConceptMasteryOutputHtml } from './render-structured-ai-tool-html';
import { renderNumberedTemplateAsCards } from './render-numbered-template-cards';
import type { MarkdownRenderOpts } from './themed-markdown-sections';

const TOOL_TYPE = 'concept-mastery-helper';

/** Themed Concept Mastery — all 12 canonical sections from Super Admin markdown. */
export function renderConceptMasteryMarkdown(text: string, opts?: MarkdownRenderOpts): string {
  if (!text?.trim()) return '';

  const mergedRaw = coalesceAiToolRawContent(text, null);
  const structured = renderConceptMasteryOutputHtml(text, mergedRaw);
  if (structured?.trim()) return structured;

  const display = resolveRichDisplayContent(text, mergedRaw);
  return renderNumberedTemplateAsCards(TOOL_TYPE, display, opts);
}
