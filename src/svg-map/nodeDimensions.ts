import type { SvgRole } from './types';

export interface WorldBoxSize {
  width: number;
  height: number;
}

/**
 * World-space node dimensions. Structural roles keep a constant size at every zoom;
 * leaves grow from a 22x22 mark (z < 0.22) to a 136x58 card (z >= 0.35).
 */
export const ROLE_DIMENSIONS: Record<SvgRole, WorldBoxSize> = {
  core: { width: 1440, height: 608 },
  domain: { width: 880, height: 372 },
  'structural-container': { width: 292, height: 124 },
  'structural-knowledge-hub': { width: 292, height: 124 },
  leaf: { width: 136, height: 58 },
};

export const LEAF_GROWTH = {
  farWidth: 22,
  farHeight: 22,
  matureWidth: 136,
  matureHeight: 58,
  transitionStartZoom: 0.22,
  transitionEndZoom: 0.35,
} as const;

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Layout box of a role. */
export function getNodeDimensions(role: SvgRole): WorldBoxSize {
  return ROLE_DIMENSIONS[role] ?? ROLE_DIMENSIONS.leaf;
}

/** Rendered size of a role at a zoom level. */
export function getVisualSize(role: SvgRole, zoom: number): WorldBoxSize {
  if (role !== 'leaf') {
    return getNodeDimensions(role);
  }
  const {
    farWidth,
    farHeight,
    matureWidth,
    matureHeight,
    transitionStartZoom,
    transitionEndZoom,
  } = LEAF_GROWTH;

  if (zoom <= transitionStartZoom) {
    return { width: farWidth, height: farHeight };
  }
  if (zoom >= transitionEndZoom) {
    return { width: matureWidth, height: matureHeight };
  }
  const s = smoothstep(
    (zoom - transitionStartZoom) / (transitionEndZoom - transitionStartZoom),
  );
  return {
    width: farWidth + (matureWidth - farWidth) * s,
    height: farHeight + (matureHeight - farHeight) * s,
  };
}
