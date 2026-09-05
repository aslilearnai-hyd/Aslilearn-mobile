import {
  type GlassTone,
} from '../../theme/glass';

export { GLASS_BLUE, glassFillColor } from '../../theme/glass';

type Props = {
  intensity?: number;
  /** Sheen gradient colors (kept for API compat — unused; surfaces are opaque). */
  colors?: [string, string];
  /** Prefer tone when colors omitted. */
  tone?: GlassTone;
  /** Extra specular catch-light (kept for API compat — unused). */
  specular?: boolean;
};

/**
 * No-op fill. Callers must set `backgroundColor` on the parent view.
 *
 * An absolute-fill sibling used to paint the card white. On Android (Fabric)
 * those overlays detach from the parent and stack as empty rounded rectangles
 * over the screen when opening tabs or pushing routes.
 */
export default function GlassSurface(_props: Props) {
  return null;
}
