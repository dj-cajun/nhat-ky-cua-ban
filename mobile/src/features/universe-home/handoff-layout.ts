import { INTRO_HANDOFF } from './handoff';

/** Intro MP4 frame aspect (width / height). Must match `universe-birth.mp4`. */
export const INTRO_VIDEO_ASPECT = 9 / 16;

export type HandoffLayout = {
  width: number;
  height: number;
  /** Sphere diameter in viewport px */
  diameter: number;
  /** Center in viewport px */
  cxPx: number;
  cyPx: number;
  left: number;
  top: number;
  /** diameter / width — may exceed design ratio under cover crop */
  diameterRatio: number;
  /** Center Y as fraction of viewport height (0 = top) */
  cy: number;
};

/**
 * Pixel layout of the handoff sphere for the current viewport.
 *
 * Matches a 9:16 intro video drawn with `object-fit: cover`, so the live
 * 2D/3D sphere lands on the same pixels as the video’s final frame.
 */
export function resolveHandoffLayout(width: number, height: number): HandoffLayout {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const viewAspect = w / h;
  const videoAspect = INTRO_VIDEO_ASPECT;
  const design = INTRO_HANDOFF.sphere.diameterRatio;
  const designCy = INTRO_HANDOFF.sphere.cy;

  let diameterRatio: number;
  let cy: number;

  if (viewAspect < videoAspect) {
    // Narrower than 9:16 → cover scales by height, crops sides → sphere larger vs width.
    diameterRatio = design * (videoAspect / viewAspect);
    cy = designCy;
  } else {
    // Wider → cover scales by width, crops top/bottom → cy shifts slightly.
    diameterRatio = design;
    cy = 0.5 + (designCy - 0.5) * (viewAspect / videoAspect);
  }

  const diameter = diameterRatio * w;
  const cxPx = INTRO_HANDOFF.sphere.cx * w;
  const cyPx = cy * h;

  return {
    width: w,
    height: h,
    diameter,
    cxPx,
    cyPx,
    left: cxPx - diameter / 2,
    top: cyPx - diameter / 2,
    diameterRatio,
    cy,
  };
}

/**
 * World-space radius + Y for a perspective camera looking at the origin along -Z,
 * so the projected sphere matches `resolveHandoffLayout`.
 */
export function resolveHandoffSphere3D(opts: {
  viewportWidth: number;
  viewportHeight: number;
  /** Camera distance from origin on +Z */
  cameraZ: number;
  /** Vertical FOV in degrees */
  fovDeg: number;
}): { radius: number; y: number } {
  const layout = resolveHandoffLayout(opts.viewportWidth, opts.viewportHeight);
  const dist = Math.abs(opts.cameraZ);
  const fov = (opts.fovDeg * Math.PI) / 180;
  const visH = 2 * dist * Math.tan(fov / 2);
  const visW = visH * (layout.width / layout.height);
  const radius = (layout.diameterRatio * visW) / 2;
  // NDC +Y is up; layout.cy is from top.
  const ndcY = 1 - 2 * layout.cy;
  const y = ndcY * (visH / 2);
  return { radius, y };
}
