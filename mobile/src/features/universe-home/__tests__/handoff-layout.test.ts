import { describe, expect, it } from 'vitest';
import { INTRO_HANDOFF } from '../handoff';
import {
  INTRO_VIDEO_ASPECT,
  resolveHandoffLayout,
  resolveHandoffSphere3D,
  resolveLiveHandoffLayout,
  resolveSettleScale,
} from '../handoff-layout';

describe('resolveHandoffLayout', () => {
  it('keeps design diameter on exact 9:16 viewports', () => {
    const w = 390;
    const h = w / INTRO_VIDEO_ASPECT;
    const layout = resolveHandoffLayout(w, h);
    expect(layout.diameterRatio).toBeCloseTo(INTRO_HANDOFF.sphere.diameterRatio, 5);
    expect(layout.cy).toBeCloseTo(INTRO_HANDOFF.sphere.cy, 5);
    expect(layout.diameter).toBeCloseTo(w * INTRO_HANDOFF.sphere.diameterRatio, 5);
  });

  it('grows diameter ratio on taller/narrower phones (cover crops sides)', () => {
    const layout = resolveHandoffLayout(390, 844);
    const expected =
      INTRO_HANDOFF.sphere.diameterRatio * (INTRO_VIDEO_ASPECT / (390 / 844));
    expect(layout.diameterRatio).toBeCloseTo(expected, 5);
    expect(layout.diameterRatio).toBeGreaterThan(INTRO_HANDOFF.sphere.diameterRatio);
    expect(layout.cy).toBeCloseTo(INTRO_HANDOFF.sphere.cy, 5);
  });

  it('keeps design diameter on wider viewports and shifts cy', () => {
    const layout = resolveHandoffLayout(1200, 800);
    expect(layout.diameterRatio).toBeCloseTo(INTRO_HANDOFF.sphere.diameterRatio, 5);
    const viewAspect = 1200 / 800;
    const expectedCy =
      0.5 + (INTRO_HANDOFF.sphere.cy - 0.5) * (viewAspect / INTRO_VIDEO_ASPECT);
    expect(layout.cy).toBeCloseTo(expectedCy, 5);
  });
});

describe('resolveLiveHandoffLayout', () => {
  it('is optically smaller than pure cover geometry (hard disc vs soft video)', () => {
    const cover = resolveHandoffLayout(390, 844);
    const live = resolveLiveHandoffLayout(390, 844);
    expect(live.diameter).toBeCloseTo(
      cover.diameter * INTRO_HANDOFF.sphere.liveOpticalScale,
      5,
    );
    expect(live.diameter).toBeLessThan(cover.diameter);
    expect(INTRO_HANDOFF.sphere.liveOpticalScale).toBeLessThan(1);
  });
});

describe('resolveHandoffSphere3D', () => {
  it('projects back to the same width ratio as live 2D layout', () => {
    const w = 390;
    const h = 844;
    const cameraZ = 4.2;
    const fovDeg = 42;
    const { radius } = resolveHandoffSphere3D({
      viewportWidth: w,
      viewportHeight: h,
      cameraZ,
      fovDeg,
    });
    const layout = resolveLiveHandoffLayout(w, h);
    const fov = (fovDeg * Math.PI) / 180;
    const visH = 2 * cameraZ * Math.tan(fov / 2);
    const visW = visH * (w / h);
    const projectedRatio = (2 * radius) / visW;
    expect(projectedRatio).toBeCloseTo(layout.diameterRatio, 5);
    expect(radius).toBeLessThan(0.55);
  });
});

describe('resolveSettleScale', () => {
  it('shrinks from live intro size down to a smaller homeDiameterRatio', () => {
    const w = 390;
    const h = 844;
    const intro = resolveLiveHandoffLayout(w, h);
    const scale = resolveSettleScale(w, h);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeCloseTo(
      (INTRO_HANDOFF.sphere.homeDiameterRatio * w) / intro.diameter,
      5,
    );
    expect(INTRO_HANDOFF.sphere.homeDiameterRatio).toBeLessThan(0.3);
    expect(INTRO_HANDOFF.settleDurationSec).toBeGreaterThan(0);
  });
});
