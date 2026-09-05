import type { ComponentProps } from 'react';
import AiToolDownloadBar from './AiToolDownloadBar';

type Props = ComponentProps<typeof AiToolDownloadBar>;

/** Same API as before; static import avoids Metro's async-chunk "Got unexpected undefined". */
export default function AiToolDownloadBarLazy(props: Props) {
  return <AiToolDownloadBar {...props} />;
}
