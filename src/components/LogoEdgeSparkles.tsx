// animates only right-side segment between two anchors
import { useEffect, useRef, useState } from 'react';

const BLEED = 64;
const DURATION_MS = 5400;
const FADE_ALPHA = 0.18;
const TAIL_RATIO = 0.045;
const SPACING_PX = 4;
const SMOOTH_WINDOW = 5;

type LogoEdgeSparklesProps = {
  src: string;
  alt?: string;
  className?: string;
};

type EdgePoint = {
  x: number;
  y: number;
};

export function LogoEdgeSparkles({ src, alt = 'Logo InfoShire', className }: LogoEdgeSparklesProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contourRef = useRef<{ outer: EdgePoint[]; mid: EdgePoint[]; inner: EdgePoint[] }>({
    outer: [],
    mid: [],
    inner: [],
  });
  const segmentRef = useRef<EdgePoint[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    handleChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return undefined;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    const ctx = context;

    let animationFrame = 0;
    let currentPixelRatio = window.devicePixelRatio || 1;
    let currentSize = { width: 0, height: 0 };
    let lastDrawTime = 0;

    let drawSize = { width: 0, height: 0 };
    const resizeCanvas = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      currentPixelRatio = pixelRatio;
      const drawW = width + BLEED * 2;
      const drawH = height + BLEED * 2;
      canvas.width = Math.max(1, Math.floor(drawW * pixelRatio));
      canvas.height = Math.max(1, Math.floor(drawH * pixelRatio));
      canvas.style.width = `${drawW}px`;
      canvas.style.height = `${drawH}px`;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      currentSize = { width, height };
      drawSize = { width: drawW, height: drawH };
      return { width, height };
    };

    resizeCanvas();
    const offscreenCanvas = document.createElement('canvas');
    const offscreenContext = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;

    const resamplePath = (points: EdgePoint[], spacing: number) => {
      if (points.length < 2) {
        return points;
      }
      const closed = [...points, points[0]];
      const resampled: EdgePoint[] = [];
      let prev = closed[0];
      resampled.push({ ...prev });
      let distance = 0;
      for (let i = 1; i < closed.length; i += 1) {
        let next = closed[i];
        let dx = next.x - prev.x;
        let dy = next.y - prev.y;
        let segmentLength = Math.hypot(dx, dy);
        while (distance + segmentLength >= spacing) {
          const t = (spacing - distance) / segmentLength;
          const point = { x: prev.x + dx * t, y: prev.y + dy * t };
          resampled.push(point);
          prev = point;
          dx = next.x - prev.x;
          dy = next.y - prev.y;
          segmentLength = Math.hypot(dx, dy);
          distance = 0;
        }
        distance += segmentLength;
        prev = next;
      }
      return resampled;
    };

    const resampleOpenPath = (points: EdgePoint[], spacing: number) => {
      if (points.length < 2) {
        return points;
      }
      const resampled: EdgePoint[] = [];
      let prev = points[0];
      resampled.push({ ...prev });
      let distance = 0;
      for (let i = 1; i < points.length; i += 1) {
        let next = points[i];
        let dx = next.x - prev.x;
        let dy = next.y - prev.y;
        let segmentLength = Math.hypot(dx, dy);
        while (distance + segmentLength >= spacing) {
          const t = (spacing - distance) / segmentLength;
          const point = { x: prev.x + dx * t, y: prev.y + dy * t };
          resampled.push(point);
          prev = point;
          dx = next.x - prev.x;
          dy = next.y - prev.y;
          segmentLength = Math.hypot(dx, dy);
          distance = 0;
        }
        distance += segmentLength;
        prev = next;
      }
      const last = resampled[resampled.length - 1];
      const end = points[points.length - 1];
      if (!last || last.x !== end.x || last.y !== end.y) {
        resampled.push({ ...end });
      }
      return resampled;
    };

    const smoothPath = (points: EdgePoint[], windowSize: number) => {
      if (points.length === 0) {
        return points;
      }
      const radius = Math.floor(windowSize / 2);
      const smoothed = points.map((_, index) => {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
          const idx = (index + offset + points.length) % points.length;
          sumX += points[idx].x;
          sumY += points[idx].y;
          count += 1;
        }
        return { x: sumX / count, y: sumY / count };
      });
      return smoothed;
    };

    const smoothOpenPath = (points: EdgePoint[], windowSize: number) => {
      if (points.length === 0) {
        return points;
      }
      const radius = Math.floor(windowSize / 2);
      const smoothed = points.map((_, index) => {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        const start = Math.max(0, index - radius);
        const end = Math.min(points.length - 1, index + radius);
        for (let i = start; i <= end; i += 1) {
          sumX += points[i].x;
          sumY += points[i].y;
          count += 1;
        }
        return { x: sumX / count, y: sumY / count };
      });
      return smoothed;
    };

    const nearestIndex = (points: EdgePoint[], anchor: EdgePoint) => {
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < points.length; i += 1) {
        const dx = points[i].x - anchor.x;
        const dy = points[i].y - anchor.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const averageX = (points: EdgePoint[]) => {
      if (points.length === 0) {
        return 0;
      }
      const sum = points.reduce((acc, point) => acc + point.x, 0);
      return sum / points.length;
    };

    const buildSegment = (points: EdgePoint[], width: number, height: number) => {
      if (points.length < 2) {
        return [];
      }
      const startAnchor = { x: 0.82 * width, y: 0.78 * height };
      const endAnchor = { x: 0.9 * width, y: 0.2 * height };
      const startIdx = nearestIndex(points, startAnchor);
      const endIdx = nearestIndex(points, endAnchor);
      const total = points.length;
      const forward: EdgePoint[] = [];
      for (let i = startIdx; ; i = (i + 1) % total) {
        forward.push(points[i]);
        if (i === endIdx) {
          break;
        }
      }
      const backward: EdgePoint[] = [];
      for (let i = startIdx; ; i = (i - 1 + total) % total) {
        backward.push(points[i]);
        if (i === endIdx) {
          break;
        }
      }
      let chosen = averageX(forward) >= averageX(backward) ? forward : backward;
      const maxLen = Math.floor(total * 0.55);
      if (chosen.length > maxLen) {
        chosen = chosen === forward ? backward : forward;
      }
      const resampledSegment = resampleOpenPath(chosen, SPACING_PX);
      return smoothOpenPath(resampledSegment, SMOOTH_WINDOW);
    };

    function drawReducedMotion() {
      const contour = segmentRef.current;
      ctx.clearRect(0, 0, drawSize.width, drawSize.height);
      if (contour.length === 0) {
        return;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 'rgba(255,255,255,0.28)';
      ctx.shadowBlur = 7;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      const offsetX = BLEED;
      const offsetY = BLEED;
      ctx.beginPath();
      contour.forEach((point, index) => {
        const x = point.x + offsetX;
        const y = point.y + offsetY;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.restore();
    }

    const drawTailLayer = (
      contour: EdgePoint[],
      headIndex: number,
      tailLen: number,
      offsetX: number,
      offsetY: number,
      lineWidth: number,
      shadowColor: string,
      shadowBlur: number,
      baseAlpha: number,
      color: { r: number; g: number; b: number },
    ) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      const length = contour.length;
      for (let k = 0; k < tailLen; k += 1) {
        const idx = (headIndex - k + length) % length;
        const nextIdx = (headIndex - k - 1 + length) % length;
        const p1 = contour[idx];
        const p2 = contour[nextIdx];
        const strength = 1 - k / tailLen;
        const alpha = Math.pow(strength, 1.6) * baseAlpha;
        if (alpha <= 0) {
          continue;
        }
        ctx.strokeStyle = rgba(color.r, color.g, color.b, alpha);
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX, p1.y + offsetY);
        ctx.lineTo(p2.x + offsetX, p2.y + offsetY);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTracer(time: number) {
      const contour = segmentRef.current;
      if (contour.length < 2) {
        return;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, drawSize.width, drawSize.height);
      ctx.restore();
      const t = (time % DURATION_MS) / DURATION_MS;
      const head = Math.floor(t * contour.length);
      const tailLen = Math.min(
        120,
        Math.max(20, Math.floor(contour.length * TAIL_RATIO)),
      );
      const offsetX = BLEED;
      const offsetY = BLEED;

      drawTailLayer(
        contour,
        head,
        tailLen,
        offsetX,
        offsetY,
        2.2,
        'rgba(139,255,0,0.10)',
        10,
        0.05,
        { r: 139, g: 255, b: 0 },
      );
      drawTailLayer(
        contour,
        head,
        tailLen,
        offsetX,
        offsetY,
        1.4,
        'rgba(255,255,255,0.40)',
        7,
        0.22,
        { r: 255, g: 255, b: 255 },
      );

      const headPoint = contour[head % contour.length];
      if (headPoint) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(255,255,255,0.35)';
        ctx.shadowBlur = 7;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(headPoint.x + offsetX, headPoint.y + offsetY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'rgba(139,255,0,0.12)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(139,255,0,0.04)';
        ctx.beginPath();
        ctx.arc(headPoint.x + offsetX, headPoint.y + offsetY, 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const updateContour = () => {
      if (!offscreenContext) {
        return;
      }
      const image = imageRef.current;
      if (!image || !image.complete) {
        return;
      }

      const { width, height } = currentSize;
      if (width <= 0 || height <= 0) {
        return;
      }

      const pixelWidth = Math.max(1, Math.floor(width * currentPixelRatio));
      const pixelHeight = Math.max(1, Math.floor(height * currentPixelRatio));
      const maxDim = 320;
      const scale = Math.min(1, maxDim / Math.max(pixelWidth, pixelHeight));
      const analysisWidth = Math.max(1, Math.floor(pixelWidth * scale));
      const analysisHeight = Math.max(1, Math.floor(pixelHeight * scale));
      offscreenCanvas.width = analysisWidth;
      offscreenCanvas.height = analysisHeight;
      offscreenContext.setTransform(1, 0, 0, 1, 0, 0);
      offscreenContext.clearRect(0, 0, analysisWidth, analysisHeight);
      offscreenContext.drawImage(image, 0, 0, analysisWidth, analysisHeight);

      const imageData = offscreenContext.getImageData(0, 0, analysisWidth, analysisHeight);
      const { data } = imageData;
      const totalPixels = analysisWidth * analysisHeight;
      const baseMask = new Uint8Array(totalPixels);
      const samplePatch = (startX: number, startY: number, size = 6) => {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;
        const endX = Math.min(analysisWidth, startX + size);
        const endY = Math.min(analysisHeight, startY + size);
        for (let y = startY; y < endY; y += 1) {
          for (let x = startX; x < endX; x += 1) {
            const idx = (y * analysisWidth + x) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count += 1;
          }
        }
        return {
          r: count > 0 ? sumR / count : 255,
          g: count > 0 ? sumG / count : 255,
          b: count > 0 ? sumB / count : 255,
        };
      };

      const topLeft = samplePatch(0, 0);
      const topRight = samplePatch(Math.max(0, analysisWidth - 6), 0);
      const bottomLeft = samplePatch(0, Math.max(0, analysisHeight - 6));
      const bottomRight = samplePatch(
        Math.max(0, analysisWidth - 6),
        Math.max(0, analysisHeight - 6),
      );
      const bgR = (topLeft.r + topRight.r + bottomLeft.r + bottomRight.r) / 4;
      const bgG = (topLeft.g + topRight.g + bottomLeft.g + bottomRight.g) / 4;
      const bgB = (topLeft.b + topRight.b + bottomLeft.b + bottomRight.b) / 4;
      const bgIsBright = bgR > 235 && bgG > 235 && bgB > 235;
      for (let i = 0; i < totalPixels; i += 1) {
        const offset = i * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];
        if (a < 10) {
          baseMask[i] = 0;
          continue;
        }
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.hypot(dr, dg, db);
        const nearWhite = bgIsBright && r > 235 && g > 235 && b > 235 && dist < 40;
        const foreground = dist > 32 && a > 10 && !nearWhite;
        baseMask[i] = foreground ? 1 : 0;
      }

      const buildOffsets = (radius: number) => {
        const offsets: Array<{ dx: number; dy: number }> = [];
        const r2 = radius * radius;
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            if (dx * dx + dy * dy <= r2) {
              offsets.push({ dx, dy });
            }
          }
        }
        return offsets;
      };

      const applyDilation = (mask: Uint8Array, radius: number) => {
        const offsets = buildOffsets(radius);
        const next = new Uint8Array(mask.length);
        for (let y = 0; y < analysisHeight; y += 1) {
          for (let x = 0; x < analysisWidth; x += 1) {
            let solid = 0;
            for (const { dx, dy } of offsets) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= analysisWidth || ny >= analysisHeight) {
                continue;
              }
              if (mask[ny * analysisWidth + nx] === 1) {
                solid = 1;
                break;
              }
            }
            next[y * analysisWidth + x] = solid;
          }
        }
        return next;
      };

      const applyErosion = (mask: Uint8Array, radius: number) => {
        const offsets = buildOffsets(radius);
        const next = new Uint8Array(mask.length);
        for (let y = 0; y < analysisHeight; y += 1) {
          for (let x = 0; x < analysisWidth; x += 1) {
            let solid = 1;
            for (const { dx, dy } of offsets) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= analysisWidth || ny >= analysisHeight) {
                solid = 0;
                break;
              }
              if (mask[ny * analysisWidth + nx] === 0) {
                solid = 0;
                break;
              }
            }
            next[y * analysisWidth + x] = solid;
          }
        }
        return next;
      };

      const morphRadius = 5;
      const solid = applyErosion(applyDilation(baseMask, morphRadius), morphRadius);

      const outside = new Uint8Array(totalPixels);
      const queue: number[] = [];
      const enqueueIfOutside = (x: number, y: number) => {
        const index = y * analysisWidth + x;
        if (solid[index] === 0 && outside[index] === 0) {
          outside[index] = 1;
          queue.push(index);
        }
      };

      for (let x = 0; x < analysisWidth; x += 1) {
        enqueueIfOutside(x, 0);
        enqueueIfOutside(x, analysisHeight - 1);
      }
      for (let y = 0; y < analysisHeight; y += 1) {
        enqueueIfOutside(0, y);
        enqueueIfOutside(analysisWidth - 1, y);
      }

      while (queue.length > 0) {
        const index = queue.pop();
        if (index === undefined) {
          break;
        }
        const x = index % analysisWidth;
        const y = Math.floor(index / analysisWidth);
        if (x > 0) enqueueIfOutside(x - 1, y);
        if (x < analysisWidth - 1) enqueueIfOutside(x + 1, y);
        if (y > 0) enqueueIfOutside(x, y - 1);
        if (y < analysisHeight - 1) enqueueIfOutside(x, y + 1);
      }

      const edgeMask = new Uint8Array(totalPixels);
      for (let y = 0; y < analysisHeight; y += 1) {
        for (let x = 0; x < analysisWidth; x += 1) {
          const index = y * analysisWidth + x;
          if (solid[index] === 0) {
            continue;
          }
          const hasOutsideNeighbor =
            (x > 0 && outside[index - 1] === 1) ||
            (x < analysisWidth - 1 && outside[index + 1] === 1) ||
            (y > 0 && outside[index - analysisWidth] === 1) ||
            (y < analysisHeight - 1 && outside[index + analysisWidth] === 1);
          if (!hasOutsideNeighbor) {
            continue;
          }
          edgeMask[index] = 1;
        }
      }

      const directions = [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
        { x: -1, y: 0 },
        { x: -1, y: -1 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
      ];

      const traceContour = (start: EdgePoint) => {
        const contourPixels: EdgePoint[] = [{ ...start }];
        let current = { ...start };
        let dir = 0;
        const maxSteps = totalPixels * 2;
        for (let steps = 0; steps < maxSteps; steps += 1) {
          let found = false;
          for (let i = 0; i < 8; i += 1) {
            const nextDir = (dir + 6 + i) % 8;
            const nx = current.x + directions[nextDir].x;
            const ny = current.y + directions[nextDir].y;
            if (nx < 0 || ny < 0 || nx >= analysisWidth || ny >= analysisHeight) {
              continue;
            }
            if (edgeMask[ny * analysisWidth + nx] === 1) {
              current = { x: nx, y: ny };
              contourPixels.push(current);
              dir = nextDir;
              found = true;
              break;
            }
          }
          if (!found) {
            break;
          }
          if (current.x === start.x && current.y === start.y && contourPixels.length > 4) {
            break;
          }
        }
        return contourPixels;
      };

      let startPixel: EdgePoint | null = null;
      for (let y = 0; y < analysisHeight; y += 1) {
        for (let x = 0; x < analysisWidth; x += 1) {
          const index = y * analysisWidth + x;
          if (edgeMask[index] === 1) {
            startPixel = { x, y };
            break;
          }
        }
        if (startPixel) {
          break;
        }
      }

      const contourPixels = startPixel ? traceContour(startPixel) : [];

      if (contourPixels.length === 0) {
        contourRef.current = { outer: [], mid: [], inner: [] };
        segmentRef.current = [];
        return;
      }

      const contourCss = contourPixels.map((point) => ({
        x: point.x / scale / currentPixelRatio,
        y: point.y / scale / currentPixelRatio,
      }));
      const resampled = resamplePath(contourCss, SPACING_PX);
      const smoothed = smoothPath(resampled, SMOOTH_WINDOW);

      const signedArea = (pts: EdgePoint[]) => {
        if (pts.length < 3) return 0;
        let sum = 0;
        for (let i = 0; i < pts.length; i += 1) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          sum += a.x * b.y - b.x * a.y;
        }
        return sum * 0.5;
      };

      const isOutsideAtCss = (point: EdgePoint) => {
        const px = Math.round(point.x * currentPixelRatio * scale);
        const py = Math.round(point.y * currentPixelRatio * scale);
        if (px < 0 || py < 0 || px >= analysisWidth || py >= analysisHeight) {
          return true;
        }
        return outside[py * analysisWidth + px] === 1;
      };

      const offsetContour = (pts: EdgePoint[], distance: number) => {
        if (pts.length === 0) {
          return pts;
        }
        const area = signedArea(pts);
        if (area === 0) {
          return pts.map((p) => ({ ...p }));
        }
        let orientation = Math.sign(area);
        const sample = pts[0];
        if (sample) {
          const next = pts[1 % pts.length];
          const prev = pts[(pts.length - 1) % pts.length];
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const tangentLength = Math.hypot(dx, dy);
          if (tangentLength > 0.001) {
            let nx = 0;
            let ny = 0;
            if (orientation > 0) {
              nx = dy / tangentLength;
              ny = -dx / tangentLength;
            } else {
              nx = -dy / tangentLength;
              ny = dx / tangentLength;
            }
            const probe = { x: sample.x + nx, y: sample.y + ny };
            if (!isOutsideAtCss(probe)) {
              orientation *= -1;
            }
          }
        }
        const length = pts.length;
        return pts.map((point, index) => {
          const prev = pts[(index - 1 + length) % length];
          const next = pts[(index + 1) % length];
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const tangentLength = Math.hypot(dx, dy);
          if (tangentLength < 0.001) {
            return { ...point };
          }
          let nx = 0;
          let ny = 0;
          if (orientation > 0) {
            nx = dy / tangentLength;
            ny = -dx / tangentLength;
          } else {
            nx = -dy / tangentLength;
            ny = dx / tangentLength;
          }
          return {
            x: point.x + nx * distance,
            y: point.y + ny * distance,
          };
        });
      };

      contourRef.current = {
        outer: offsetContour(smoothed, 8),
        mid: offsetContour(smoothed, 6),
        inner: offsetContour(smoothed, 3),
      };
      segmentRef.current = buildSegment(contourRef.current.outer, width, height);
      ctx.clearRect(0, 0, drawSize.width, drawSize.height);
      if (prefersReducedMotion) {
        drawReducedMotion();
      }
    };

    const ensureImage = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        updateContour();
      };
      imageRef.current = img;
    };

    ensureImage();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      updateContour();
    });
    resizeObserver.observe(wrapper);


    if (prefersReducedMotion) {
      drawReducedMotion();
      return () => {
        resizeObserver.disconnect();
      };
    }

    const animate = (time: number) => {
      if (time - lastDrawTime < 1000 / 30) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      lastDrawTime = time;
      drawTracer(time);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [prefersReducedMotion, src]);

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block w-full overflow-visible ${className ?? ''}`.trim()}
    >
      <img
        src={src}
        alt={alt}
        className="relative z-10 w-full h-auto object-contain"
        loading="lazy"
      />
      <canvas
        ref={canvasRef}
        className="z-20 pointer-events-none"
        style={{
          position: 'absolute',
          left: `-${BLEED}px`,
          top: `-${BLEED}px`,
          width: `calc(100% + ${BLEED * 2}px)`,
          height: `calc(100% + ${BLEED * 2}px)`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
