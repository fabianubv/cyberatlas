import type { SvgRole } from './types'
import { getDomainRailWidth } from './nodePresentation'

export type CardZoneAlignment = 'left' | 'center'

export const FONT_FAMILY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export type RoleCompositionTokens = {
  titleAlignment: CardZoneAlignment
  titleAnchorYRatio: number
  metadataAlignment: CardZoneAlignment
  metadataAnchorYRatio: number
  metadataTracking: number
  titleWeight: number
  metadataWeight: number
  wrapMaxChars: number
  leftInsetRatio: number
  hasLeftRail: boolean
  hasBadge: boolean
}

/** Layout of each card: where the title, metadata and badge sit, per role. */
export const CARD_COMPOSITION_TOKENS: Record<SvgRole, RoleCompositionTokens> = {
  core: {
    titleAlignment: 'center',
    titleAnchorYRatio: 0.50,
    metadataAlignment: 'center',
    metadataAnchorYRatio: 0.22,
    metadataTracking: 2.0,
    titleWeight: 580,
    metadataWeight: 500,
    wrapMaxChars: 20,
    leftInsetRatio: 0.08,
    hasLeftRail: false,
    hasBadge: false,
  },
  domain: {
    titleAlignment: 'center',
    titleAnchorYRatio: 0.50,
    metadataAlignment: 'center',
    metadataAnchorYRatio: 0.22,
    metadataTracking: 2.0,
    titleWeight: 480,
    metadataWeight: 500,
    wrapMaxChars: 20,
    leftInsetRatio: 0.08,
    hasLeftRail: false,
    hasBadge: false,
  },
  'structural-container': {
    titleAlignment: 'center',
    titleAnchorYRatio: 0.52,
    metadataAlignment: 'left',
    metadataAnchorYRatio: 0.22,
    metadataTracking: 1.2,
    titleWeight: 540,
    metadataWeight: 450,
    wrapMaxChars: 20,
    leftInsetRatio: 0.07,
    hasLeftRail: false,
    hasBadge: true,
  },
  leaf: {
    titleAlignment: 'center',
    titleAnchorYRatio: 0.52,
    metadataAlignment: 'left',
    metadataAnchorYRatio: 0.22,
    metadataTracking: 1.0,
    titleWeight: 500,
    metadataWeight: 420,
    wrapMaxChars: 16,
    leftInsetRatio: 0.07,
    hasLeftRail: false,
    hasBadge: true,
  },
  'structural-knowledge-hub': {
    titleAlignment: 'center',
    titleAnchorYRatio: 0.52,
    metadataAlignment: 'left',
    metadataAnchorYRatio: 0.22,
    metadataTracking: 1.0,
    titleWeight: 500,
    metadataWeight: 420,
    wrapMaxChars: 16,
    leftInsetRatio: 0.07,
    hasLeftRail: false,
    hasBadge: true,
  },
}

export type ResolvedCardComposition = {
  tokens: RoleCompositionTokens
  stripWidth: number
  leftInset: number
  titleAnchorX: number
  titleAnchorY: number
  titleTextAnchor: 'start' | 'middle'
  metadataAnchorX: number
  metadataAnchorY: number
  metadataTextAnchor: 'start' | 'middle'
  metadataTracking: number
  availableTitleWidth: number
  availableTitleHeight: number
}

/** Resolves the three zones of a card. The title position is independent of metadata and badge, so it never shifts as they appear. */
export function getCardComposition(
  role: SvgRole,
  bodyWidth: number,
  bodyHeight: number,
  zoom: number,
  _hasChildren = false,
): ResolvedCardComposition {
  void _hasChildren
  const effectiveRole: SvgRole =
    role === 'structural-knowledge-hub' ? 'structural-container' : role
  const tokens = CARD_COMPOSITION_TOKENS[effectiveRole] || CARD_COMPOSITION_TOKENS.leaf
  const z = Math.max(zoom, 0.001)

  const stripWidth = tokens.hasLeftRail ? getDomainRailWidth(bodyWidth, zoom) : 0

  let leftInset: number
  if (effectiveRole === 'domain') {
    leftInset = bodyWidth * tokens.leftInsetRatio
  } else if (effectiveRole === 'structural-container') {
    leftInset = Math.max(10 / z, bodyWidth * tokens.leftInsetRatio)
  } else if (effectiveRole === 'leaf') {
    leftInset = Math.max(8 / z, bodyWidth * tokens.leftInsetRatio)
  } else {
    leftInset = bodyWidth * tokens.leftInsetRatio
  }

  const titleAnchorX = tokens.titleAlignment === 'left' ? leftInset : bodyWidth / 2
  const titleAnchorY = bodyHeight * tokens.titleAnchorYRatio
  const titleTextAnchor: 'start' | 'middle' = tokens.titleAlignment === 'left' ? 'start' : 'middle'

  const metadataAnchorX = tokens.metadataAlignment === 'left' ? leftInset : bodyWidth / 2
  const metadataAnchorY = bodyHeight * tokens.metadataAnchorYRatio
  const metadataTextAnchor: 'start' | 'middle' = tokens.metadataAlignment === 'left' ? 'start' : 'middle'

  let availableTitleWidth: number
  if (effectiveRole === 'domain') {
    availableTitleWidth = bodyWidth * 0.88
  } else if (effectiveRole === 'structural-container') {
    availableTitleWidth = bodyWidth * 0.86
  } else if (effectiveRole === 'core') {
    availableTitleWidth = bodyWidth * 0.88
  } else {
    const config = ROLE_COMPOSITION[effectiveRole as keyof typeof ROLE_COMPOSITION] || ROLE_COMPOSITION.leaf
    if (zoom >= 0.50) {
      availableTitleWidth = Math.max(bodyWidth * 0.84, config.referenceWidth * 0.84)
    } else {
      availableTitleWidth = bodyWidth * 0.84
    }
  }

  let availableTitleHeight: number
  if (effectiveRole === 'domain') {
    availableTitleHeight = bodyHeight * 0.70
  } else if (effectiveRole === 'core') {
    availableTitleHeight = bodyHeight * 0.70
  } else if (effectiveRole === 'structural-container') {
    availableTitleHeight = bodyHeight * 0.48
  } else {
    const config = ROLE_COMPOSITION[effectiveRole as keyof typeof ROLE_COMPOSITION] || ROLE_COMPOSITION.leaf
    if (zoom >= 0.50) {
      availableTitleHeight = Math.max(bodyHeight * 0.48, config.referenceHeight * 0.48)
    } else {
      availableTitleHeight = bodyHeight * 0.48
    }
  }

  return {
    tokens,
    stripWidth,
    leftInset,
    titleAnchorX,
    titleAnchorY,
    titleTextAnchor,
    metadataAnchorX,
    metadataAnchorY,
    metadataTextAnchor,
    metadataTracking: tokens.metadataTracking,
    availableTitleWidth,
    availableTitleHeight,
  }
}

export function smoothstep(min: number, max: number, x: number): number {
  if (x <= min) return 0
  if (x >= max) return 1
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

export type RoleContentPhase = {
  titleOpacity: number
  metadataOpacity: number
  badgeOpacity: number
}

/** Content opacity by role and zoom. All cards of a role share the same values, and titles always appear before metadata. */
export function getRoleContentPhase(
  role: SvgRole,
  zoom: number,
  _hasChildren = false,
): RoleContentPhase {
  void _hasChildren
  const z = Math.max(zoom, 0.001)
  const effectiveRole: SvgRole =
    role === 'structural-knowledge-hub' ? 'structural-container' : role

  switch (effectiveRole) {
    case 'core': {
      const titleOpacity = 1.0
      const metadataOpacity = smoothstep(0.06, 0.15, z)
      const badgeOpacity = smoothstep(0.04, 0.08, z)
      return {
        titleOpacity,
        metadataOpacity,
        badgeOpacity,
      }
    }

    case 'domain': {
      const titleOpacity = smoothstep(0.02, 0.08, z)
      const metadataOpacity = smoothstep(0.06, 0.15, z)
      const badgeOpacity = smoothstep(0.08, 0.16, z)
      return {
        titleOpacity,
        metadataOpacity,
        badgeOpacity: Math.min(badgeOpacity, titleOpacity),
      }
    }

    case 'structural-container': {
      const titleOpacity = smoothstep(0.14, 0.28, z)
      const metadataOpacity = smoothstep(0.24, 0.38, z)
      const badgeOpacity = smoothstep(0.26, 0.40, z)
      return {
        titleOpacity,
        metadataOpacity,
        badgeOpacity: Math.min(badgeOpacity, titleOpacity),
      }
    }

    case 'leaf':
    default: {
      const titleOpacity = smoothstep(0.32, 0.52, z)
      const metadataOpacity = smoothstep(0.48, 0.65, z)
      const badgeOpacity = smoothstep(0.48, 0.68, z)
      return {
        titleOpacity,
        metadataOpacity,
        badgeOpacity: Math.min(badgeOpacity, titleOpacity),
      }
    }
  }
}

export type RoleTypographyScale = {
  titleScreenFont: number
  metadataScreenFont: number
  titleMinScreenFont: number
  titleMaxScreenFont: number
}

/** Typography proportions per role, relative to card height. Keeps core > domain > group > leaf at every zoom. */
export const ROLE_COMPOSITION = {
  core: {
    referenceZoom: 0.24,
    referenceHeight: 640,
    referenceWidth: 1513.85,
    titleRatio: 0.2450,
    metadataRatio: 0.0750,
    minScreenTitleFont: 0,
    maxScreenTitleFont: 500.0,
    minScreenMetadataFont: 0,
    maxScreenMetadataFont: 200.0,
  },
  domain: {
    referenceZoom: 0.24,
    referenceHeight: 400,
    referenceWidth: 946.15,
    titleRatio: 0.1950,
    metadataRatio: 0.1050,
    minScreenTitleFont: 0,
    maxScreenTitleFont: 400.0,
    minScreenMetadataFont: 0,
    maxScreenMetadataFont: 150.0,
  },
  'structural-container': {
    referenceZoom: 0.49,
    referenceHeight: 160,
    referenceWidth: 378.46,
    titleRatio: 0.1715,
    metadataRatio: 0.0945,
    minScreenTitleFont: 9.5,
    maxScreenTitleFont: 90.0,
    minScreenMetadataFont: 6.0,
    maxScreenMetadataFont: 50.0,
  },
  leaf: {
    referenceZoom: 3.00,
    referenceHeight: 64,
    referenceWidth: 151.38,
    titleRatio: 0.1520,
    metadataRatio: 0.0719,
    minScreenTitleFont: 8.0,
    maxScreenTitleFont: 80.0,
    minScreenMetadataFont: 4.0,
    maxScreenMetadataFont: 40.0,
  },
  'structural-knowledge-hub': {
    referenceZoom: 3.00,
    referenceHeight: 75,
    referenceWidth: 177.40,
    titleRatio: 0.1520,
    metadataRatio: 0.0719,
    minScreenTitleFont: 7.0,
    maxScreenTitleFont: 80.0,
    minScreenMetadataFont: 4.5,
    maxScreenMetadataFont: 28.0,
  },
} as const

export type RoleCompositionConfig = (typeof ROLE_COMPOSITION)[keyof typeof ROLE_COMPOSITION]

/** Font size scales with the card, so text never shrinks or re-wraps as the zoom changes. */
export function getTypographyScale(
  role: SvgRole,
  zoom: number,
  bodyHeight?: number,
): RoleTypographyScale {
  const z = Math.max(zoom, 0.001)
  const effectiveRole: SvgRole =
    role === 'structural-knowledge-hub' ? 'structural-container' : role
  const config: RoleCompositionConfig =
    effectiveRole in ROLE_COMPOSITION
      ? ROLE_COMPOSITION[effectiveRole as keyof typeof ROLE_COMPOSITION]
      : ROLE_COMPOSITION.leaf

  const refHeight = bodyHeight ? bodyHeight : config.referenceHeight
  const worldTitleFont = refHeight * config.titleRatio
  const worldMetaFont = refHeight * config.metadataRatio

  const titleScreenFont = Math.min(config.maxScreenTitleFont, worldTitleFont * z)
  const metadataScreenFont = Math.min(config.maxScreenMetadataFont, worldMetaFont * z)

  return {
    titleScreenFont,
    metadataScreenFont,
    titleMinScreenFont: config.minScreenTitleFont,
    titleMaxScreenFont: config.maxScreenTitleFont,
  }
}

export type LeafUtilityPresentation = {
  padWorldSize: number
  padScreenSize: number
  padGapWorld: number
  clusterTotalW: number
  padStartX: number
  padStartY: number
  padRx: number
  padNormalizedX: number
  padNormalizedY: number
  padToHeightRatio: number

  ringRadiusWorld: number
  ringScreenRadius: number
  ringScreenDiameter: number
  ringStrokeWorld: number
  ringScreenStroke: number
  ringCx: number
  ringCy: number
  ringNormalizedCx: number
  ringNormalizedCy: number
  ringDiameterToHeightRatio: number
}

/** Relevance pads and mastery ring, proportional to the card body so they stay in place at every zoom. */
export function getLeafUtilityPresentation(
  bodyWidth: number,
  bodyHeight: number,
  zoom: number,
): LeafUtilityPresentation {
  const z = Math.max(zoom, 0.001)

  const padRatio = 0.055
  const padWorldSize = bodyHeight * padRatio
  const padScreenSize = padWorldSize * z
  const padGapWorld = padWorldSize * 0.5
  const clusterTotalW = 4 * padWorldSize + 3 * padGapWorld
  const clusterEndX = bodyWidth * 0.94
  const padStartX = clusterEndX - clusterTotalW
  const padStartY = bodyHeight * 0.22 - padWorldSize / 2
  const padRx = padWorldSize * 0.2

  const ringRadiusRatio = 0.060
  const ringRadiusWorld = bodyHeight * ringRadiusRatio
  const ringScreenRadius = ringRadiusWorld * z
  const ringScreenDiameter = ringScreenRadius * 2
  const ringCx = bodyWidth * 0.93
  const ringCy = bodyHeight * 0.84
  const ringStrokeRatio = 0.015
  const ringScreenStroke = Math.max(1.0, bodyHeight * ringStrokeRatio * z)
  const ringStrokeWorld = ringScreenStroke / z

  return {
    padWorldSize,
    padScreenSize,
    padGapWorld,
    clusterTotalW,
    padStartX,
    padStartY,
    padRx,
    padNormalizedX: padStartX / bodyWidth,
    padNormalizedY: padStartY / bodyHeight,
    padToHeightRatio: padWorldSize / bodyHeight,

    ringRadiusWorld,
    ringScreenRadius,
    ringScreenDiameter,
    ringStrokeWorld,
    ringScreenStroke,
    ringCx,
    ringCy,
    ringNormalizedCx: ringCx / bodyWidth,
    ringNormalizedCy: ringCy / bodyHeight,
    ringDiameterToHeightRatio: (ringRadiusWorld * 2) / bodyHeight,
  }
}

