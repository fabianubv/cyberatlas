import type { KnowledgeNode } from '../data'
import type { SvgRole } from './types'
import { getNodeRoleLabel } from './nodeComposition'
import { getCardComposition, getRoleContentPhase, getTypographyScale } from './cardDesignSystem'
import { getSemanticFarLandmark } from './nodePresentation'

export function smoothstep(min: number, max: number, x: number): number {
  if (x <= min) return 0
  if (x >= max) return 1
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

/** Estimates text width from per-character widths, so rendering never has to measure the DOM. */
export function estimateTextWidth(text: string, fontSize: number, letterSpacing = 0): number {
  if (!text) return 0
  let widthEm = 0
  for (const ch of text) {
    if ('ijl|!:\';.,'.includes(ch)) {
      widthEm += 0.32
    } else if (ch === ' ') {
      widthEm += 0.32
    } else if ('frt-()[]1'.includes(ch)) {
      widthEm += 0.44
    } else if ('mwMW—@%'.includes(ch)) {
      widthEm += 0.95
    } else if ((ch >= 'A' && ch <= 'Z') || 'ÁÉÍÓÚÑ'.includes(ch)) {
      widthEm += 0.76
    } else {
      widthEm += 0.60
    }
  }
  return widthEm * fontSize + Math.max(0, text.length - 1) * letterSpacing
}

/** Splits a title into two lines with the smallest possible length difference. */
export function wrapTitleTextBalanced(text: string): [string, string] {
  const words = text.trim().split(/\s+/)
  if (words.length <= 1) {
    return [text, '']
  }

  let bestSplit = 1
  let minDiff = Infinity

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ')
    const line2 = words.slice(i).join(' ')
    const diff = Math.abs(line1.length - line2.length)
    if (diff < minDiff) {
      minDiff = diff
      bestSplit = i
    }
  }

  const line1 = words.slice(0, bestSplit).join(' ')
  const line2 = words.slice(bestSplit).join(' ')
  return [line1, line2]
}

export type ResponsiveTitleLayout = {
  wrappedLines: string[]
  titleFontSize: number
  lineCount: number
}

/** Fits a title to a card: one line if possible, then two balanced lines, and only then a smaller font. As zoom grows, line count never increases. */
export function resolveResponsiveTitle(
  name: string,
  targetWorldFont: number,
  availableWidth: number,
  availableHeight: number,
  letterSpacing = 0,
): ResponsiveTitleLayout {
  const singleLineWidth = estimateTextWidth(name, targetWorldFont, letterSpacing)
  if (singleLineWidth <= availableWidth && targetWorldFont <= availableHeight * 0.88) {
    return {
      wrappedLines: [name],
      titleFontSize: targetWorldFont,
      lineCount: 1,
    }
  }

  const words = name.trim().split(/\s+/)
  if (words.length <= 1) {
    const widthEm = estimateTextWidth(name, 1, 0)
    const nonFontWidth = Math.max(0, name.length - 1) * letterSpacing
    const fontByW = (availableWidth - nonFontWidth) / Math.max(widthEm, 0.1)
    const fontByH = availableHeight * 0.88
    return {
      wrappedLines: [name],
      titleFontSize: Math.max(1, Math.min(targetWorldFont, fontByW, fontByH)),
      lineCount: 1,
    }
  }

  const [line1, line2] = wrapTitleTextBalanced(name)
  const line1W = estimateTextWidth(line1, targetWorldFont, letterSpacing)
  const line2W = estimateTextWidth(line2, targetWorldFont, letterSpacing)
  const max2LineWidth = Math.max(line1W, line2W)

  if (max2LineWidth <= availableWidth && 2.1 * targetWorldFont <= availableHeight) {
    return {
      wrappedLines: [line1, line2],
      titleFontSize: targetWorldFont,
      lineCount: 2,
    }
  }

  const unitLine1W = estimateTextWidth(line1, 1, letterSpacing)
  const unitLine2W = estimateTextWidth(line2, 1, letterSpacing)
  const unitMaxW = Math.max(unitLine1W, unitLine2W, 0.1)
  const fontByW = availableWidth / unitMaxW
  const fontByH = availableHeight / 2.1
  const fittedFont = Math.min(targetWorldFont, fontByW, fontByH)

  return {
    wrappedLines: [line1, line2],
    titleFontSize: fittedFont,
    lineCount: 2,
  }
}

export type NodeTypographyInput = {
  role: SvgRole
  type: KnowledgeNode['type']
  name: string
  childCount?: number
  zoom: number
  bodyWidth: number
  bodyHeight: number
}

export type NodeTypographyState = {
  titleOpacity: number
  roleOpacity: number
  badgeOpacity: number
  titleFontSize: number
  roleFontSize: number
  titleScreenFontSize: number
  wrappedLines: string[]
  roleLabel: string
  showRoleLabel: boolean
  showTitle: boolean
  showBadge: boolean
  textAnchor: 'start' | 'middle'
  textStartX: number
  titleY: number
  roleY: number
  titleAnchorX: number
  titleAnchorY: number
  titleTextAnchor: 'start' | 'middle'
  roleAnchorX: number
  roleAnchorY: number
  roleTextAnchor: 'start' | 'middle'
  roleLetterSpacing: number
  titleWeight: number
  roleWeight: number
}

/** Derives reveal progress, font sizes and wrapping from the role, the zoom and the card size. */
export function getNodeTypographyState({
  role,
  type,
  name,
  childCount,
  zoom,
  bodyWidth,
  bodyHeight,
}: NodeTypographyInput): NodeTypographyState {
  const z = Math.max(zoom, 0.001)
  const hasChildren = Boolean(childCount && childCount > 0)
  const roleLabel = getNodeRoleLabel(type, role)

  const comp = getCardComposition(role, bodyWidth, bodyHeight, zoom, hasChildren)

  const phase = getRoleContentPhase(role, zoom, hasChildren)
  const titleOpacity = phase.titleOpacity
  const roleOpacity = phase.metadataOpacity
  const badgeOpacity = phase.badgeOpacity

  const scale = getTypographyScale(role, zoom, bodyHeight)

  const targetWorldFont = scale.titleScreenFont / z
  const letterSpacing = role === 'core' ? 1.2 : (role === 'domain' ? 0.5 : 0)
  const responsiveTitle = resolveResponsiveTitle(
    name,
    targetWorldFont,
    comp.availableTitleWidth,
    comp.availableTitleHeight,
    letterSpacing,
  )

  const wrappedLines = responsiveTitle.wrappedLines
  const isMultiline = wrappedLines.length > 1
  const titleFontSize = responsiveTitle.titleFontSize
  const roleFontSize = Math.min(scale.metadataScreenFont / z, bodyHeight * 0.14)

  const farLandmark = getSemanticFarLandmark(role, zoom, bodyWidth, bodyHeight, comp.stripWidth)
  const titleScreenFontSize = farLandmark.isFarActive
    ? Math.max(scale.titleScreenFont, farLandmark.screenFontSize * farLandmark.farOpacity + (titleFontSize * z) * farLandmark.normalOpacity)
    : titleFontSize * z

  const isLeafLike = role === 'leaf'
  const isTinyEmergingCard = isLeafLike && bodyHeight * z < 34
  const showRoleLabel = !isTinyEmergingCard && roleOpacity > 0.05

  let safeTitleOpacity = titleOpacity
  if (isLeafLike && !isMultiline) {
    const singleLineWidth = estimateTextWidth(wrappedLines[0] || '', titleFontSize, letterSpacing)
    const maxBoundary = bodyWidth * 0.94
    if (singleLineWidth > maxBoundary && maxBoundary > 0) {
      const fitRatio = Math.max(0, Math.min(1, maxBoundary / singleLineWidth))
      safeTitleOpacity = titleOpacity * Math.min(1, Math.max(0, (fitRatio - 0.6) / 0.4))
    }
  }

  const showTitle = safeTitleOpacity > 0.05

  return {
    titleOpacity: safeTitleOpacity,
    roleOpacity,
    badgeOpacity,
    titleFontSize,
    roleFontSize,
    titleScreenFontSize,
    wrappedLines,
    roleLabel,
    showRoleLabel,
    showTitle,
    showBadge: badgeOpacity > 0.05,
    textAnchor: comp.titleTextAnchor,
    textStartX: comp.titleAnchorX,
    titleY: comp.titleAnchorY,
    roleY: comp.metadataAnchorY,
    titleAnchorX: comp.titleAnchorX,
    titleAnchorY: comp.titleAnchorY,
    titleTextAnchor: comp.titleTextAnchor,
    roleAnchorX: comp.metadataAnchorX,
    roleAnchorY: comp.metadataAnchorY,
    roleTextAnchor: comp.metadataTextAnchor,
    roleLetterSpacing: comp.metadataTracking,
    titleWeight: comp.tokens.titleWeight,
    roleWeight: comp.tokens.metadataWeight,
  }
}
