import { describe, it, expect } from 'vitest'
import { loadData } from '../data'
import { createSvgMapData } from './svgGeometry'
import {
  getParentNodeId,
  getSubtreeBounds,
  getNodeFocusCamera,
  getSmartMobileEntryCamera,
} from './nodeFocus'
import { getResponsivePadding, CAMERA_LIMITS } from './camera'

describe('Node Focus and Mobile Responsive Navigation', () => {
  const { graph, rootId, routes } = loadData()
  const data = createSvgMapData(graph, rootId, routes)

  describe('getResponsivePadding', () => {
    it('returns 16px on mobile phones (min dimension <= 480px)', () => {
      // iPhone 13 Pro Max portrait (428 x 926)
      expect(getResponsivePadding(428, 926)).toBe(16)
      // iPhone 13 Pro Max landscape (926 x 428)
      expect(getResponsivePadding(926, 428)).toBe(16)
      // Small mobile (375 x 667)
      expect(getResponsivePadding(375, 667)).toBe(16)
    })

    it('returns 30px on tablets (min dimension <= 1024px)', () => {
      // iPad Pro 12.9" portrait (1024 x 1366)
      expect(getResponsivePadding(1024, 1366)).toBe(30)
      // iPad landscape (1024 x 768) -> min dimension 768 <= 1024
      expect(getResponsivePadding(1024, 768)).toBe(30)
      // iPad Air (820 x 1180)
      expect(getResponsivePadding(820, 1180)).toBe(30)
    })

    it('returns 38px on desktop (min dimension > 1024px)', () => {
      // Full HD desktop (1920 x 1080)
      expect(getResponsivePadding(1920, 1080)).toBe(38)
      // 4K desktop (2560 x 1440)
      expect(getResponsivePadding(2560, 1440)).toBe(38)
    })
  })

  describe('getParentNodeId', () => {
    it('returns null for the central core (root)', () => {
      expect(getParentNodeId(rootId, data)).toBeNull()
    })

    it('returns rootId for architectural domains', () => {
      expect(getParentNodeId('computing', data)).toBe(rootId)
      expect(getParentNodeId('networking', data)).toBe(rootId)
      expect(getParentNodeId('grc-domain', data)).toBe(rootId)
      expect(getParentNodeId('identity-access', data)).toBe(rootId)
    })

    it('returns domain for direct domain children groups', () => {
      const parent = getParentNodeId('identity-directories', data)
      expect(parent).toBe('identity-access')
    })

    it('returns group/hub for deep concept leaves', () => {
      const parent = getParentNodeId('active-directory', data)
      expect(parent).toBe('identity-directories')
    })
  })

  describe('getSubtreeBounds', () => {
    it('returns the entire universe bounds for root', () => {
      const bounds = getSubtreeBounds(rootId, data)
      expect(bounds).toEqual(data.bounds)
    })

    it('calculates subtree bounds containing the domain and its descendants', () => {
      const domBounds = getSubtreeBounds('identity-access', data)
      expect(domBounds).not.toBeNull()
      const domainNode = data.byId.get('identity-access')!

      // Subtree bounds must contain the domain node itself
      expect(domBounds!.left).toBeLessThanOrEqual(domainNode.x)
      expect(domBounds!.right).toBeGreaterThanOrEqual(domainNode.x + domainNode.width)
      expect(domBounds!.top).toBeLessThanOrEqual(domainNode.y)
      expect(domBounds!.bottom).toBeGreaterThanOrEqual(domainNode.y + domainNode.height)
    })

    it('returns exact bounding box for a leaf node', () => {
      const leaf = data.nodes.find(n => n.role === 'leaf')!
      const leafBounds = getSubtreeBounds(leaf.id, data)
      expect(leafBounds).toEqual({
        left: leaf.x,
        right: leaf.x + leaf.width,
        top: leaf.y,
        bottom: leaf.y + leaf.height,
      })
    })
  })

  describe('getNodeFocusCamera', () => {
    it('calculates a valid camera focusing on domain and its children', () => {
      const cam = getNodeFocusCamera('identity-access', data, 1920, 1080)
      expect(cam).not.toBeNull()
      expect(cam!.zoom).toBeGreaterThanOrEqual(0.20)
      expect(cam!.zoom).toBeLessThanOrEqual(0.38)
    })

    it('immerses into groups with mature card scale and dives into leaves at maximum zoom', () => {
      const groupCam = getNodeFocusCamera('computing-hardware', data, 1920, 1080)
      expect(groupCam).not.toBeNull()
      expect(groupCam!.zoom).toBeGreaterThanOrEqual(0.65)
      expect(groupCam!.zoom).toBeLessThanOrEqual(0.95)

      const leaf = data.nodes.find(n => n.role === 'leaf')!
      const leafCam = getNodeFocusCamera(leaf.id, data, 1920, 1080)
      expect(leafCam).not.toBeNull()
      expect(leafCam!.zoom).toBe(CAMERA_LIMITS.maxZoom)

      const leafCamPhone = getNodeFocusCamera(leaf.id, data, 428, 926)
      expect(leafCamPhone).not.toBeNull()
      expect(leafCamPhone!.zoom).toBe(3.0)
    })
  })

  describe('getSmartMobileEntryCamera', () => {
    it('provides comfortable reading scale on iPhone 13 Pro Max (portrait & landscape)', () => {
      const portraitCam = getSmartMobileEntryCamera(data, 428, 926)
      expect(portraitCam.zoom).toBeGreaterThanOrEqual(0.12)
      expect(portraitCam.zoom).toBeLessThanOrEqual(0.20)

      const landscapeCam = getSmartMobileEntryCamera(data, 926, 428)
      expect(landscapeCam.zoom).toBeGreaterThanOrEqual(0.12)
      expect(landscapeCam.zoom).toBeLessThanOrEqual(0.20)
    })
  })
})
