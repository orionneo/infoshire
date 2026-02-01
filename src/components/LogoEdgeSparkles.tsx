import { useEffect, useRef, useState } from 'react';

const BLEED = 44;
const DURATION_MS = 14000;
const SPACING_PX = 2;
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
  const contourRef = useRef<EdgePoint[]>([]);
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

    function drawReducedMotion() {
      const contour = contourRef.current;
      ctx.clearRect(0, 0, drawSize.width, drawSize.height);
      if (contour.length === 0) {
        return;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 'rgba(139,255,0,0.45)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(139,255,0,0.08)';
      const offsetX = BLEED;
      const offsetY = BLEED;
      for (let i = 0; i < contour.length; i += 12) {
        const point = contour[i];
        ctx.beginPath();
        ctx.arc(point.x + offsetX, point.y + offsetY, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawTracer(time: number) {
      const contour = contourRef.current;
      ctx.clearRect(0, 0, drawSize.width, drawSize.height);
      if (contour.length === 0) {
        return;
      }
      const t = (time % DURATION_MS) / DURATION_MS;
      const head = Math.floor(t * contour.length);
      const tailLen = Math.max(1, Math.floor(contour.length * 0.1));
      const fadeOut = clamp((t - 0.9) / 0.1, 0, 1);
      const offsetX = BLEED;
      const offsetY = BLEED;

      const drawLayer = (
        color: string,
        blur: number,
        alphaScale: number,
        headRadius: number,
        tailRadius: number,
      ) => {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        for (let k = 0; k <= tailLen; k += 1) {
          const idx = (head - k + contour.length) % contour.length;
          const point = contour[idx];
          const strength = 1 - k / tailLen;
          let alpha = clamp(0.02 + strength * 0.4, 0, 0.42);
          alpha *= 1 - fadeOut;
          const radius = tailRadius + (headRadius - tailRadius) * strength;
          ctx.fillStyle = color.replace('ALPHA', `${alpha * alphaScale}`);
          ctx.beginPath();
          ctx.arc(point.x + offsetX, point.y + offsetY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      drawLayer('rgba(139,255,0,ALPHA)', 22, 0.55, 2.2, 1.2);
      drawLayer('rgba(255,255,255,ALPHA)', 12, 1, 1.6, 0.8);

      const headPoint = contour[head % contour.length];
      if (headPoint) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(255,255,255,0.35)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.arc(headPoint.x + offsetX, headPoint.y + offsetY, 2.6, 0, Math.PI * 2);
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
      offscreenCanvas.width = pixelWidth;
      offscreenCanvas.height = pixelHeight;
      offscreenContext.setTransform(1, 0, 0, 1, 0, 0);
      offscreenContext.clearRect(0, 0, pixelWidth, pixelHeight);
      offscreenContext.drawImage(image, 0, 0, pixelWidth, pixelHeight);

      const imageData = offscreenContext.getImageData(0, 0, pixelWidth, pixelHeight);
      const { data } = imageData;
      const totalPixels = pixelWidth * pixelHeight;
      const solid = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i += 1) {
        solid[i] = data[i * 4 + 3] > 32 ? 1 : 0;
      }

      const outside = new Uint8Array(totalPixels);
      const queue: number[] = [];
      const enqueueIfOutside = (x: number, y: number) => {
        const index = y * pixelWidth + x;
        if (solid[index] === 0 && outside[index] === 0) {
          outside[index] = 1;
          queue.push(index);
        }
      };

      for (let x = 0; x < pixelWidth; x += 1) {
        enqueueIfOutside(x, 0);
        enqueueIfOutside(x, pixelHeight - 1);
      }
      for (let y = 0; y < pixelHeight; y += 1) {
        enqueueIfOutside(0, y);
        enqueueIfOutside(pixelWidth - 1, y);
      }

      while (queue.length > 0) {
        const index = queue.pop();
        if (index === undefined) {
          break;
        }
        const x = index % pixelWidth;
        const y = Math.floor(index / pixelWidth);
        if (x > 0) enqueueIfOutside(x - 1, y);
        if (x < pixelWidth - 1) enqueueIfOutside(x + 1, y);
        if (y > 0) enqueueIfOutside(x, y - 1);
        if (y < pixelHeight - 1) enqueueIfOutside(x, y + 1);
      }

      const edgeMask = new Uint8Array(totalPixels);
      let startPoint: EdgePoint | null = null;
      for (let y = 0; y < pixelHeight; y += 1) {
        for (let x = 0; x < pixelWidth; x += 1) {
          const index = y * pixelWidth + x;
          if (solid[index] === 0) {
            continue;
          }
          const hasOutsideNeighbor =
            (x > 0 && outside[index - 1] === 1) ||
            (x < pixelWidth - 1 && outside[index + 1] === 1) ||
            (y > 0 && outside[index - pixelWidth] === 1) ||
            (y < pixelHeight - 1 && outside[index + pixelWidth] === 1);
          if (!hasOutsideNeighbor) {
            continue;
          }
          edgeMask[index] = 1;
          if (!startPoint || x > startPoint.x || (x === startPoint.x && y < startPoint.y)) {
            startPoint = { x, y };
          }
        }
      }

      if (!startPoint) {
        contourRef.current = [];
        return;
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

      const contourPixels: EdgePoint[] = [{ ...startPoint }];
      let current = { ...startPoint };
      let dir = 0;
      const maxSteps = totalPixels * 2;
      for (let steps = 0; steps < maxSteps; steps += 1) {
        let found = false;
        for (let i = 0; i < 8; i += 1) {
          const nextDir = (dir + 6 + i) % 8;
          const nx = current.x + directions[nextDir].x;
          const ny = current.y + directions[nextDir].y;
          if (nx < 0 || ny < 0 || nx >= pixelWidth || ny >= pixelHeight) {
            continue;
          }
          if (edgeMask[ny * pixelWidth + nx] === 1) {
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
        if (current.x === startPoint.x && current.y === startPoint.y && contourPixels.length > 4) {
          break;
        }
      }

      const contourCss = contourPixels.map((point) => ({
        x: point.x / currentPixelRatio,
        y: point.y / currentPixelRatio,
      }));
      const resampled = resamplePath(contourCss, SPACING_PX);
      contourRef.current = smoothPath(resampled, SMOOTH_WINDOW);
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
      className={`relative inline-block w-full ${className ?? ''}`.trim()}
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
