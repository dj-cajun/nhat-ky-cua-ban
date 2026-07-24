#!/usr/bin/env python3
"""
Cinematic 9:16 universe-birth intro (4s @ 30fps).
Matches mobile INTRO_HANDOFF for crossfade into 3D home.
"""
from __future__ import annotations

import math
import struct
import subprocess
import sys
import zlib
from pathlib import Path

import numpy as np

W, H = 1080, 1920
FPS = 30
DURATION = 4.0
FRAMES = int(FPS * DURATION)

CX, CY = 0.5, 0.48
DIAMETER_RATIO = 0.42
BG = np.array([5.0, 6.0, 10.0])
GOLD = np.array([240.0, 195.0, 106.0])
GLOW = np.array([255.0, 230.0, 168.0])
CORE = np.array([255.0, 246.0, 214.0])
WHITE = np.array([255.0, 255.0, 252.0])

FRAME_DIR = Path("/tmp/universe-intro-frames-v2")
OUT_MP4 = Path("/workspace/mobile/assets/intro/universe-birth.mp4")
ART = Path("/opt/cursor/artifacts/screenshots")


def smoothstep(a: float, b: float, x: float) -> float:
    if b == a:
        return 0.0
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep_arr(a: float, b: float, x: np.ndarray) -> np.ndarray:
    if b <= a:
        return (x >= b).astype(np.float64)
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def write_png(path: Path, rgb: np.ndarray) -> None:
    h, w, _ = rgb.shape
    raw = bytearray()
    flat = rgb.reshape(h, w * 3)
    for y in range(h):
        raw.append(0)
        raw.extend(flat[y].tobytes())
    compressed = zlib.compress(bytes(raw), 3)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b""))


ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
DX = (xs - CX * W) / W
DY = (ys - CY * H) / W
R = np.sqrt(DX * DX + DY * DY)


def soft_disc(radius: float, softness: float) -> np.ndarray:
    if radius <= 1e-8:
        return (R < 1e-4).astype(np.float64)
    soft = max(softness, 1e-5)
    return 1.0 - smoothstep_arr(radius - soft, radius + soft * 0.25, R)


def shade_orb(orb_rad: float, lx: float, ly: float, lz: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns (rgb, coverage mask, halo)."""
    nx = DX / max(orb_rad, 1e-6)
    ny = DY / max(orb_rad, 1e-6)
    inside = (nx * nx + ny * ny) <= 1.0
    nz = np.zeros_like(nx)
    nz[inside] = np.sqrt(np.clip(1.0 - nx[inside] ** 2 - ny[inside] ** 2, 0.0, 1.0))

    ndotl = np.clip(nx * lx + ny * ly + nz * lz, 0.0, 1.0)
    fresnel = np.clip(1.0 - nz, 0.0, 1.0) ** 2.4

    # Keep limb bright so visible diameter ≈ geometric diameter (handoff 42%).
    base = GOLD * 0.82 + GLOW * 0.14
    lit = base[None, None, :] * (0.42 + 0.58 * ndotl)[:, :, None]
    lit = lit + (GLOW * 0.28)[None, None, :] * fresnel[:, :, None]

    # specular (view ≈ +Z)
    hx, hy, hz = lx, ly, lz + 1.0
    hlen = math.sqrt(hx * hx + hy * hy + hz * hz)
    hx, hy, hz = hx / hlen, hy / hlen, hz / hlen
    ndoth = np.clip(nx * hx + ny * hy + nz * hz, 0.0, 1.0)
    spec = (ndoth ** 56) * inside
    lit = lit + np.array([255.0, 250.0, 240.0])[None, None, :] * (0.62 * spec[:, :, None])

    # soft luminous core
    core_m = soft_disc(orb_rad * 0.36, orb_rad * 0.14) * inside
    lit = lit * (1.0 - 0.4 * core_m[:, :, None]) + CORE[None, None, :] * (0.65 * core_m[:, :, None])

    edge = 1.0 - smoothstep_arr(orb_rad * 0.9, orb_rad * 1.01, R)
    mask = inside.astype(np.float64) * edge

        halo = soft_disc(orb_rad * 1.45, orb_rad * 0.4) * (1.0 - mask)
    return lit, mask, halo


def render_frame(t: float) -> np.ndarray:
    img = np.zeros((H, W, 3), dtype=np.float64)
    img[:] = BG

    # Birth expansion → white
    expand = smoothstep(0.15, 1.45, t)
    birth_r = lerp(0.0035, 1.2, expand ** 0.9)
    birth_soft = lerp(0.01, 0.28, expand)
    disc = soft_disc(birth_r, birth_soft)

    grow = smoothstep(0.08, 0.75, t)
    peak = smoothstep(1.05, 1.42, t)
    fade = 1.0 - smoothstep(1.48, 2.32, t)
    strength = min(1.0, (0.25 + 0.9 * grow)) * fade
    white_mix = peak * fade

    warm = GLOW * 0.55 + WHITE * 0.35 + GOLD * 0.1
    birth_col = warm * (1.0 - white_mix) + WHITE * white_mix

    img = img * (1.0 - disc[:, :, None] * strength) + birth_col[None, None, :] * (disc[:, :, None] * strength)
    wash = peak * fade
    if wash > 0:
        img = img * (1.0 - 0.98 * wash) + WHITE[None, None, :] * (0.98 * wash)

    # Orb era
    orb_a = smoothstep(1.85, 2.55, t)
    if orb_a > 0:
        space = np.zeros((H, W, 3), dtype=np.float64)
        space[:] = BG

        # sparse stars
        star_a = 0.4 * smoothstep(2.15, 3.0, t)
        if star_a > 0:
            rng = np.random.default_rng(7)
            for _ in range(70):
                sx = int(rng.integers(0, W))
                sy = int(rng.integers(0, H))
                if ((sx / W - CX) ** 2 + ((sy / H - CY) * (H / W)) ** 2) < 0.045:
                    continue
                space[sy, sx] = lerp(space[sy, sx], np.array([210.0, 215.0, 230.0]), star_a * float(rng.uniform(0.25, 0.75)))

        hold = smoothstep(3.45, 3.85, t)
        breathe = 1.0 + 0.01 * math.sin(t * 1.15) * (1.0 - hold)
        orb_rad = (DIAMETER_RATIO * 0.5) * breathe

        orbit = smoothstep(2.35, 2.75, t) * (1.0 - 0.92 * hold)
        ang = lerp(-0.6, 0.7, smoothstep(2.4, 3.55, t)) * orbit
        elev = 0.35 + 0.2 * smoothstep(2.4, 3.3, t)
        lx = math.cos(ang) * 0.6
        ly = -math.sin(ang) * 0.28 - elev * 0.25
        lz = 0.72
        llen = math.sqrt(lx * lx + ly * ly + lz * lz)
        lx, ly, lz = lx / llen, ly / llen, lz / llen

        lit, mask, halo = shade_orb(orb_rad, lx, ly, lz)
        mask = mask * orb_a
        halo = halo * (0.5 * orb_a)

        space = space + GLOW[None, None, :] * halo[:, :, None]
        space = space * (1.0 - mask[:, :, None]) + lit * mask[:, :, None]

        blend = smoothstep(1.9, 2.5, t)
        img = img * (1.0 - blend) + space * blend

    return np.clip(img, 0, 255).astype(np.uint8)


def main() -> int:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    OUT_MP4.parent.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)

    print(f"Rendering {FRAMES} frames…", flush=True)
    checkpoints = {0: "t0", 15: "t05", 45: "t15", 60: "t20", 75: "t25", 105: "t35", 119: "t397"}
    for i in range(FRAMES):
        t = i / FPS
        frame = render_frame(t)
        write_png(FRAME_DIR / f"frame-{i:04d}.png", frame)
        if i in checkpoints:
            write_png(ART / f"intro-{checkpoints[i]}.png", frame)
        if i % 15 == 0 or i == FRAMES - 1:
            print(f"  frame {i + 1}/{FRAMES} (t={t:.2f}s)", flush=True)

    print("Encoding MP4…", flush=True)
    subprocess.check_call(
        [
            "ffmpeg", "-y",
            "-framerate", str(FPS),
            "-i", str(FRAME_DIR / "frame-%04d.png"),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-profile:v", "high",
            "-crf", "17",
            "-movflags", "+faststart",
            "-an",
            str(OUT_MP4),
        ]
    )
    print(f"Wrote {OUT_MP4} ({OUT_MP4.stat().st_size / 1024 / 1024:.2f} MB)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
