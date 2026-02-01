import { useEffect, useRef, useState } from 'react';

const MAX_PARTICLES = 32;
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
  alpha: number;
  life: number;
  age: number;
  streakLength: number;
  hasStreak: boolean;
  hasStar: boolean;
  rotation: number;
  rotationSpeed: number;
};

export function LogoEdgeSparkles({ src, alt = 'Logo InfoShire', className }: LogoEdgeSparklesProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

    const resizeCanvas = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return { width, height };
    };

    let size = resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      size = resizeCanvas();
    });
    resizeObserver.observe(wrapper);

    const spawnParticle = () => {
      const edge = Math.floor(Math.random() * 4);
      const padding = randomBetween(EDGE_PADDING_MIN, EDGE_PADDING_MAX);
      let x = 0;
      let y = 0;
      let vx = 0;
      let vy = 0;
      const baseSpeed = randomBetween(3, 8);

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

      return {
        x,
        y,
        vx,
        vy,
        radius: randomBetween(0.6, 1.6),
        alpha: randomBetween(0.08, 0.22),
        life: randomBetween(3.2, 6.2),
        age: 0,
        streakLength: randomBetween(8, 18),
        hasStreak: Math.random() < 0.35,
        hasStar: Math.random() < 0.12,
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
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${particle.alpha})`;
      context.fill();

      if (particle.hasStreak) {
        context.strokeStyle = `rgba(255,255,255,${particle.alpha * 0.35})`;
        context.lineWidth = 0.8;
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

    const drawStatic = () => {
      context.clearRect(0, 0, size.width, size.height);
      particles = Array.from({ length: 3 }, spawnParticle);
      particles.forEach((particle) => {
        particle.alpha *= 0.6;
        particle.hasStreak = false;
        particle.hasStar = Math.random() < 0.5;
        drawParticle(particle);
      });
    };

    const animate = (time: number) => {
      if (document.hidden) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      context.clearRect(0, 0, size.width, size.height);

      if (particles.length < MAX_PARTICLES) {
        particles.push(spawnParticle());
      }

      particles = particles.filter((particle) => {
        particle.age += delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.rotation += particle.rotationSpeed * delta;

        const lifeProgress = particle.age / particle.life;
        const fade = Math.sin(Math.min(lifeProgress, 1) * Math.PI);
        particle.alpha = Math.max(0.04, particle.alpha * fade);

        drawParticle(particle);
        return particle.age < particle.life;
      });

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
  }, [prefersReducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block w-full ${className ?? ''}`.trim()}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-auto object-contain"
        loading="lazy"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          WebkitMaskImage: `url(${src})`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskImage: `url(${src})`,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'contain',
        }}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
}
