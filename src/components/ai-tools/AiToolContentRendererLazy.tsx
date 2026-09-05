import type { ComponentProps } from 'react';
import AiToolContentRenderer from './AiToolContentRenderer';

type Props = ComponentProps<typeof AiToolContentRenderer>;

/**
 * Same public API as before. Expo Go's Metro incremental bundler throws
 * "Got unexpected undefined" when this was a React.lazy() async chunk,
 * so the renderer is imported statically.
 */
export default function AiToolContentRendererLazy(props: Props) {
  return <AiToolContentRenderer {...props} />;
}
