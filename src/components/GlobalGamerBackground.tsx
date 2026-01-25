import { useEffect, useRef } from 'react';
import backgroundGamer from '@/assets/images/background-gamer.png';

// URL da imagem oficial INFOSHIRE_GAMER_BG
const BG_URL = backgroundGamer;

export default function GlobalGamerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollY = useRef(0);
  const mouseX = useRef(0.5);
  const mouseY = useRef(0.5);
  const lastFrameTime = useRef(0);
  const scanlineY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track scroll
    const handleScroll = () => {
      scrollY.current = window.scrollY;
      updateCSSVariables();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Track mouse (desktop only)
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth >= 768) {
        mouseX.current = e.clientX / window.innerWidth;
        mouseY.current = e.clientY / window.innerHeight;
        updateCSSVariables();
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Partículas com glow
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    const particleCount = window.innerWidth < 768 ? 28 : 55;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.16 + 0.06,
      });
    }

    // Linhas HUD decorativas
    const hudLines: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'corner' | 'line' | 'arc';
    }> = [];

    const hudCount = window.innerWidth < 768 ? 4 : 8;
    for (let i = 0; i < hudCount; i++) {
      const type = ['corner', 'line', 'arc'][Math.floor(Math.random() * 3)] as 'corner' | 'line' | 'arc';
      hudLines.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        width: Math.random() * 60 + 20,
        height: Math.random() * 60 + 20,
        type,
      });
    }

    // Update CSS variables para parallax
    const updateCSSVariables = () => {
      document.documentElement.style.setProperty('--scrollY', `${scrollY.current}`);
      document.documentElement.style.setProperty('--mx', `${mouseX.current}`);
      document.documentElement.style.setProperty('--my', `${mouseY.current}`);
    };

    // Animação com FPS limit e visibility check
    let animationFrameId: number;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      // Pausar quando tab não está visível
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      // Limit FPS
      const elapsed = currentTime - lastFrameTime.current;
      if (elapsed < frameInterval) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime.current = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid sutil
      const isMobile = window.innerWidth < 768;
      ctx.globalAlpha = isMobile ? 0.015 : 0.025;
      ctx.strokeStyle = '#00ff78';
      ctx.lineWidth = 0.5;
      const gridSize = 80;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - (scrollY.current * 0.08) % gridSize);
        ctx.lineTo(canvas.width, y - (scrollY.current * 0.08) % gridSize);
        ctx.stroke();
      }

      // Desenhar partículas com glow (2x draw)
      particles.forEach((particle) => {
        // Atualizar posição
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        const parallaxY = scrollY.current * 0.04;

        // Glow (maior, alpha baixo)
        ctx.globalAlpha = particle.opacity * 0.3;
        ctx.fillStyle = '#00ff78';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y - parallaxY, particle.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core (menor, mais forte)
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y - parallaxY, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Desenhar HUD lines
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#00ff78';
      ctx.lineWidth = 1.5;
      hudLines.forEach((hud) => {
        ctx.beginPath();
        if (hud.type === 'corner') {
          // L-shape corner
          ctx.moveTo(hud.x, hud.y);
          ctx.lineTo(hud.x + hud.width, hud.y);
          ctx.moveTo(hud.x, hud.y);
          ctx.lineTo(hud.x, hud.y + hud.height);
        } else if (hud.type === 'line') {
          // Horizontal line
          ctx.moveTo(hud.x, hud.y);
          ctx.lineTo(hud.x + hud.width, hud.y);
        } else if (hud.type === 'arc') {
          // Arc
          ctx.arc(hud.x, hud.y, hud.width / 2, 0, Math.PI / 2);
        }
        ctx.stroke();
      });

      // Scanline horizontal (atravessa lentamente)
      scanlineY.current += 0.5;
      if (scanlineY.current > canvas.height) scanlineY.current = 0;
      
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#00ff78';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanlineY.current);
      ctx.lineTo(canvas.width, scanlineY.current);
      ctx.stroke();

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Parallax Layer A (base) - mais visível e mais claro */}
      <div 
        className="absolute inset-0 xl:opacity-50 opacity-40"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(1.1) contrast(1.08) brightness(1.15) blur(0.4px)',
          transform: 'translateY(calc(var(--scrollY, 0) * 0.10px)) translate3d(calc((var(--mx, 0.5) - 0.5) * 18px), calc((var(--my, 0.5) - 0.5) * 12px), 0)',
          willChange: 'transform',
        }}
      />
      
      {/* Parallax Layer B (depth) - profundidade mais clara */}
      <div 
        className="absolute inset-0 xl:opacity-20 opacity-15"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(1.1) contrast(1.08) brightness(1.15) blur(0.6px)',
          transform: 'translateY(calc(var(--scrollY, 0) * 0.18px)) translate3d(calc((var(--mx, 0.5) - 0.5) * -26px), calc((var(--my, 0.5) - 0.5) * -18px), 0)',
          willChange: 'transform',
        }}
      />
      
      {/* Overlay principal - MUITO mais leve para deixar o fundo aparecer */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/25 via-black/20 to-black/30" />
      
      {/* Neon wash verde sutil */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.08), transparent 60%)',
        }}
      />
      
      {/* Vignette muito leve - bordas escuras, centro bem claro */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.10) 85%, rgba(0,0,0,0.20) 100%)',
        }}
      />
      
      {/* Canvas para HUD/particles - bem visível */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-85"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Elementos HUD decorativos nos cantos */}
      <div className="absolute top-8 left-8 w-24 h-24 border-l-2 border-t-2 border-primary/15 opacity-60" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border-r-2 border-b-2 border-primary/15 opacity-60" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-primary/10 opacity-50" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-primary/10 opacity-50" />
    </div>
  );
}
