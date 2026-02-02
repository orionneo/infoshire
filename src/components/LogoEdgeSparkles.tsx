type LogoEdgeSparklesProps = {
  src: string;
  alt?: string;
  className?: string;
};

export function LogoEdgeSparkles({ src, alt = 'Logo InfoShire', className }: LogoEdgeSparklesProps) {
  return (
    <div className={`relative inline-block ${className ?? ''}`.trim()}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 rounded-[22px] opacity-60 blur-[10px] mix-blend-screen"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 45%, rgba(255,255,255,0.22) 0%, rgba(139,255,0,0.10) 35%, rgba(0,0,0,0) 70%)',
        }}
      />
      <img
        src={src}
        alt={alt}
        className="relative z-10 w-full h-auto object-contain"
        style={{
          filter:
            'drop-shadow(0 0 6px rgba(255,255,255,0.18)) drop-shadow(0 0 10px rgba(139,255,0,0.08))',
        }}
        loading="lazy"
      />
    </div>
  );
}
