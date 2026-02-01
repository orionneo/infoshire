import { useEffect, useRef, useState } from 'react';

const MAX_PARTICLES = 72;
const EDGE_PADDING_MIN = 8;
const EDGE_PADDING_MAX = 18;

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

type LogoEdgeSparklesProps = {
  src: string;
  alt?: string;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  life: number;
  age: number;
  streakLength: number;
  hasStreak: boolean;
  hasStar: boolean;
  rotation: number;
  rotationSpeed: number;
};

type EdgePoint = {
  x: number;
  y: number;
};

export function LogoEdgeSparkles({ src, alt = 'Logo InfoShire', className }: LogoEdgeSparklesProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const edgePointsRef = useRef<EdgePoint[]>([]);
  const cornerPoolsRef = useRef<{
    topLeft: EdgePoint[];
    topRight: EdgePoint[];
    bottomLeft: EdgePoint[];
    bottomRight: EdgePoint[];
  }>({ topLeft: [], topRight: [], bottomLeft: [], bottomRight: [] });
  const edgeBoundsRef = useRef({
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  });
  const glowCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

    let animationFrame = 0;
    let lastTime = 0;
    let particles: Particle[] = [];
    let spawnAccumulator = 0;
    let lastGlowDraw = 0;
    let currentPixelRatio = window.devicePixelRatio || 1;
    let currentSize = { width: 0, height: 0 };

    const resizeCanvas = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      currentPixelRatio = pixelRatio;
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      currentSize = { width, height };
      return { width, height };
    };

    let size = resizeCanvas();
    const offscreenCanvas = document.createElement('canvas');
    const offscreenContext = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    const glowCanvas = document.createElement('canvas');
    const glowContext = glowCanvas.getContext('2d');
    glowCanvasRef.current = glowCanvas;

    const updateEdgePoints = () => {
      if (!offscreenContext || !glowContext) {
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
      const points: EdgePoint[] = [];
      let minX = pixelWidth;
      let maxX = 0;
      let minY = pixelHeight;
      let maxY = 0;
      const alphaAt = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= pixelWidth || y >= pixelHeight) {
          return 0;
        }
        return data[(y * pixelWidth + x) * 4 + 3];
      };

      for (let y = 0; y < pixelHeight; y += 1) {
        for (let x = 0; x < pixelWidth; x += 1) {
          const alpha = alphaAt(x, y);
          if (alpha <= 20) {
            continue;
          }
          if (x < minX) {
            minX = x;
          }
          if (x > maxX) {
            maxX = x;
          }
          if (y < minY) {
            minY = y;
          }
          if (y > maxY) {
            maxY = y;
          }
          if (
            alphaAt(x - 1, y) === 0 ||
            alphaAt(x + 1, y) === 0 ||
            alphaAt(x, y - 1) === 0 ||
            alphaAt(x, y + 1) === 0
          ) {
            points.push({ x: x / currentPixelRatio, y: y / currentPixelRatio });
          }
        }
      }

      edgePointsRef.current = points;
      if (points.length > 0 && minX <= maxX && minY <= maxY) {
        const cssMinX = minX / currentPixelRatio;
        const cssMaxX = maxX / currentPixelRatio;
        const cssMinY = minY / currentPixelRatio;
        const cssMaxY = maxY / currentPixelRatio;
        edgeBoundsRef.current = { minX: cssMinX, maxX: cssMaxX, minY: cssMinY, maxY: cssMaxY };
        const cornerW = (cssMaxX - cssMinX) * 0.22;
        const cornerH = (cssMaxY - cssMinY) * 0.22;
        const topLeft = points.filter(
          (point) => point.x <= cssMinX + cornerW && point.y <= cssMinY + cornerH,
        );
        const topRight = points.filter(
          (point) => point.x >= cssMaxX - cornerW && point.y <= cssMinY + cornerH,
        );
        const bottomLeft = points.filter(
          (point) => point.x <= cssMinX + cornerW && point.y >= cssMaxY - cornerH,
        );
        const bottomRight = points.filter(
          (point) => point.x >= cssMaxX - cornerW && point.y >= cssMaxY - cornerH,
        );
        cornerPoolsRef.current = { topLeft, topRight, bottomLeft, bottomRight };
      } else {
        cornerPoolsRef.current = { topLeft: [], topRight: [], bottomLeft: [], bottomRight: [] };
        edgeBoundsRef.current = { minX: 0, maxX: size.width, minY: 0, maxY: size.height };
      }

      glowCanvas.width = pixelWidth;
      glowCanvas.height = pixelHeight;
      glowContext.setTransform(1, 0, 0, 1, 0, 0);
      glowContext.clearRect(0, 0, pixelWidth, pixelHeight);
      glowContext.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    };

    const ensureImage = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        updateEdgePoints();
      };
      imageRef.current = img;
    };

    ensureImage();
    const resizeObserver = new ResizeObserver(() => {
      size = resizeCanvas();
      updateEdgePoints();
    });
    resizeObserver.observe(wrapper);

    const spawnParticle = (forceGlint = false) => {
      const edgePoints = edgePointsRef.current;
      const pools = cornerPoolsRef.current;
      const padding = randomBetween(EDGE_PADDING_MIN, EDGE_PADDING_MAX);
      let x = 0;
      let y = 0;
      let vx = 0;
      let vy = 0;
      const baseSpeed = randomBetween(3, 8);

      if (edgePoints.length > 0) {
        const poolOptions = [pools.topLeft, pools.topRight, pools.bottomLeft, pools.bottomRight].map(
          (pool) => (pool.length > 0 ? pool : edgePoints),
        );
        const selectedPool = poolOptions[Math.floor(Math.random() * poolOptions.length)];
        const point = selectedPool[Math.floor(Math.random() * selectedPool.length)];
        x = point.x;
        y = point.y;
        const { minX, maxX, minY, maxY } = edgeBoundsRef.current;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const length = Math.hypot(dx, dy) || 1;
        const jitter = randomBetween(-1.2, 1.2);
        vx = (dx / length) * baseSpeed + jitter;
        vy = (dy / length) * baseSpeed + randomBetween(-1.2, 1.2);
      } else {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
          x = randomBetween(padding, size.width - padding);
          y = padding;
          vx = Math.random() < 0.5 ? baseSpeed : -baseSpeed;
          vy = randomBetween(-1.5, 1.5);
        } else if (edge === 1) {
          x = size.width - padding;
          y = randomBetween(padding, size.height - padding);
          vx = randomBetween(-1.5, 1.5);
          vy = Math.random() < 0.5 ? baseSpeed : -baseSpeed;
        } else if (edge === 2) {
          x = randomBetween(padding, size.width - padding);
          y = size.height - padding;
          vx = Math.random() < 0.5 ? baseSpeed : -baseSpeed;
          vy = randomBetween(-1.5, 1.5);
        } else {
          x = padding;
          y = randomBetween(padding, size.height - padding);
          vx = randomBetween(-1.5, 1.5);
          vy = Math.random() < 0.5 ? baseSpeed : -baseSpeed;
        }
      }

      const isGlint = forceGlint || Math.random() < 0.13;
      const baseAlpha = isGlint ? randomBetween(0.6, 0.95) : randomBetween(0.35, 0.75);
      return {
        x,
        y,
        vx,
        vy,
        radius: isGlint ? randomBetween(4, 6) : randomBetween(1.6, 3.4),
        baseAlpha,
        alpha: baseAlpha,
        life: isGlint ? randomBetween(2.6, 4.4) : randomBetween(3.2, 6.2),
        age: 0,
        streakLength: isGlint ? randomBetween(24, 40) : randomBetween(12, 22),
        hasStreak: isGlint || Math.random() < 0.35,
        hasStar: Math.random() < (isGlint ? 0.4 : 0.12),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-0.6, 0.6),
      } satisfies Particle;
    };

    const drawStar = (particle: Particle) => {
      const rays = 6 + Math.floor(Math.random() * 2);
      const innerRadius = particle.radius * 0.6;
      const outerRadius = particle.radius * 2.4;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.beginPath();
      for (let i = 0; i < rays * 2; i += 1) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / rays) * i;
        context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      context.closePath();
      context.fillStyle = `rgba(255,255,255,${particle.alpha * 0.55})`;
      context.fill();
      context.restore();
    };

    const drawParticle = (particle: Particle) => {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * 1.9, 0, Math.PI * 2);
      context.fillStyle = `rgba(139,255,0,${particle.alpha * 0.35})`;
      context.fill();

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${particle.alpha})`;
      context.fill();

      if (particle.hasStreak) {
        context.strokeStyle = `rgba(255,255,255,${particle.alpha * 0.5})`;
        context.lineWidth = 0.95;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(
          particle.x - particle.vx * 0.08 * particle.streakLength,
          particle.y - particle.vy * 0.08 * particle.streakLength,
        );
        context.stroke();
      }

      if (particle.hasStar) {
        drawStar(particle);
      }
    };

    const drawOutlineGlow = (time: number) => {
      if (time - lastGlowDraw < 120 && lastGlowDraw !== 0) {
        return;
      }
      lastGlowDraw = time;
      if (!glowCanvasRef.current) {
        return;
      }
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = 0.22;
      context.shadowColor = 'rgba(139,255,0,0.75)';
      context.shadowBlur = 22;
      context.drawImage(glowCanvasRef.current, 0, 0, size.width, size.height);
      context.restore();
    };

    const drawStatic = () => {
      context.clearRect(0, 0, size.width, size.height);
      drawOutlineGlow(0);
      particles = Array.from({ length: 4 }, () => spawnParticle(true));
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.shadowColor = 'rgba(139,255,0,0.95)';
      context.shadowBlur = 42;
      particles.forEach((particle) => {
        particle.alpha = Math.max(0.08, particle.baseAlpha * 0.6);
        particle.hasStreak = false;
        particle.hasStar = Math.random() < 0.5;
        drawParticle(particle);
      });
      context.restore();
    };

    const animate = (time: number) => {
      if (document.hidden) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      context.clearRect(0, 0, size.width, size.height);

      drawOutlineGlow(time);

      const spawnRate = 70;
      spawnAccumulator += delta * spawnRate;
      const availableSlots = MAX_PARTICLES - particles.length;
      const spawnCount = Math.min(Math.floor(spawnAccumulator), availableSlots, 4);
      if (spawnCount > 0) {
        spawnAccumulator -= spawnCount;
        for (let i = 0; i < spawnCount; i += 1) {
          particles.push(spawnParticle());
        }
      }

      context.save();
      context.globalCompositeOperation = 'lighter';
      context.shadowColor = 'rgba(139,255,0,0.95)';
      context.shadowBlur = 42;
      particles = particles.filter((particle) => {
        particle.age += delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.rotation += particle.rotationSpeed * delta;

        const lifeProgress = particle.age / particle.life;
        const fade = Math.sin(Math.min(lifeProgress, 1) * Math.PI);
        particle.alpha = Math.max(0.08, particle.baseAlpha * fade);

        drawParticle(particle);
        return particle.age < particle.life;
      });
      context.restore();

      animationFrame = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      drawStatic();
      return () => {
        resizeObserver.disconnect();
      };
    }

    animationFrame = requestAnimationFrame((time) => {
      lastTime = time;
      animate(time);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        animationFrame = requestAnimationFrame((time) => {
          lastTime = time;
          animate(time);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        className="absolute inset-0 z-20 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
