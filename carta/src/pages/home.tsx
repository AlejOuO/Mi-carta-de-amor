import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, opts: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(vol: number): void;
  getPlayerState(): number;
  destroy(): void;
}

const PARTICLE_COUNT = 20;

// TV Girl style floating particles — little stars and glitches
const particles_bg = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
  id: i,
  left: `${3 + (i / PARTICLE_COUNT) * 94}%`,
  top: `${10 + ((i * 37) % 80)}%`,
  duration: 8 + (i % 6) * 3,
  delay: (i % 8) * 0.9,
  opacity: 0.1 + (i % 4) * 0.08,
  scale: 0.3 + (i % 3) * 0.2,
  shape: i % 3 === 0 ? "★" : i % 3 === 1 ? "♥" : "◆",
}));

const FALL_COUNT = 28;

interface FallingItemData {
  id: number;
  left: number;
  duration: number;
  delay: number;
  opacity: number;
  size: number;
  drift: number;
  shape: string;
  color: string;
}

const fallingItems: FallingItemData[] = Array.from({ length: FALL_COUNT }).map((_, i) => ({
  id: i,
  left: 2 + (i / FALL_COUNT) * 96,
  duration: 9 + (i % 8) * 2.8,
  delay: -(i % 12) * 1.5,
  opacity: 0.13 + (i % 4) * 0.07,
  size: 10 + (i % 4) * 5,
  drift: (i % 2 === 0 ? 1 : -1) * (18 + (i % 5) * 14),
  shape: i % 3 === 0 ? "★" : i % 3 === 1 ? "♥" : "◆",
  color: i % 3 === 0 ? "hsl(320 90% 65%)" : i % 3 === 1 ? "hsl(205 85% 60%)" : "hsl(270 70% 65%)",
}));

const FallingItem = memo(function FallingItem({ item }: { item: FallingItemData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const totalHeight = 700;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const animate = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp + item.delay * 1000;
      }
      const elapsed = (timestamp - startRef.current) / 1000;
      const progress = ((elapsed % item.duration) + item.duration) % item.duration;
      const span = totalHeight + 120;
      const y = progress * span - 120;
      const x = Math.sin(progress * Math.PI * 2) * item.drift * 0.5;
      const rotate = progress * 360;
      node.style.transform = `translateY(${y}px) translateX(${x}px) rotate(${rotate}deg)`;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [item.delay, item.duration, item.drift]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${item.left}%`,
        top: 0,
        fontSize: item.size,
        color: item.color,
        opacity: item.opacity,
        filter: `drop-shadow(0 0 4px ${item.color})`,
        pointerEvents: "none",
        userSelect: "none",
        willChange: "transform",
      }}
    >
      {item.shape}
    </div>
  );
});

const PARTICLE_SHAPES = ["★", "♥", "◆", "✦", "♥", "★", "◆"];

interface Particle {
  id: number;
  x: number;
  y: number;
  pieces: {
    angle: number;
    distance: number;
    shape: string;
    size: number;
    color: string;
  }[];
}

// TV Girl colors: fuchsia, electric blue, purple, pink
const COLORS = [
  "hsl(320 90% 65%)",
  "hsl(205 85% 60%)",
  "hsl(270 70% 65%)",
  "hsl(340 80% 70%)",
  "hsl(190 90% 55%)",
];

let nextId = 0;

export default function Home() {
  const [phase, setPhase] = useState<"intro" | "closed" | "opening" | "open">("intro");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerElRef = useRef<HTMLDivElement>(null);
  const musicStartedRef = useRef(false);
  const playerReadyRef = useRef(false);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtReady(true);
      return;
    }
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  const startMusic = useCallback(() => {
    if (!ytReady || playerRef.current || !playerElRef.current) return;
    playerRef.current = new window.YT.Player(playerElRef.current, {
      videoId: "IyZzGgBBzo8",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        loop: 1,
        playlist: "IyZzGgBBzo8",
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: { target: YTPlayer }) => {
          event.target.setVolume(55);
          event.target.playVideo();
          playerReadyRef.current = true;
          setMusicPlaying(true);
        },
      },
    });
  }, [ytReady]);

  const toggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current || !playerReadyRef.current) {
      if (!musicStartedRef.current) {
        musicStartedRef.current = true;
        startMusic();
      }
      return;
    }
    const state = playerRef.current.getPlayerState();
    if (state === 1) {
      playerRef.current.pauseVideo();
      setMusicPlaying(false);
    } else {
      playerRef.current.playVideo();
      setMusicPlaying(true);
    }
  };

  const handleIntroClick = () => {
    if (!musicStartedRef.current && ytReady) {
      musicStartedRef.current = true;
      startMusic();
    }
    setPhase("closed");
  };

  const handleEnvelopeClick = () => {
    if (phase !== "closed") return;
    if (!musicStartedRef.current && ytReady) {
      musicStartedRef.current = true;
      startMusic();
    }
    setPhase("opening");
    timerRef.current = setTimeout(() => setPhase("open"), 700);
  };

  const handleClose = () => setPhase("closed");

  const spawnParticles = useCallback((x: number, y: number) => {
    if (phase !== "closed") return;
    if (!musicStartedRef.current && ytReady) {
      musicStartedRef.current = true;
      startMusic();
    }
    const count = 7 + Math.floor(Math.random() * 5);
    const pieces = Array.from({ length: count }).map((_, i) => ({
      angle: (360 / count) * i + (Math.random() - 0.5) * 30,
      distance: 40 + Math.random() * 55,
      shape: PARTICLE_SHAPES[i % PARTICLE_SHAPES.length],
      size: 10 + Math.random() * 14,
      color: COLORS[i % COLORS.length],
    }));
    const particle: Particle = { id: nextId++, x, y, pieces };
    setParticles((prev) => [...prev, particle]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== particle.id));
    }, 1100);
  }, [phase, ytReady, startMusic]);

  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const spawnPointerParticles = (x: number, y: number) => {
    const now = performance.now();
    if (now - lastSpawnRef.current < 16) return;
    lastSpawnRef.current = now;
    spawnParticles(x, y);
  };

  const handleScreenPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "closed") return;
    draggingRef.current = true;
    spawnPointerParticles(e.clientX, e.clientY);
  };

  const handleScreenPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "closed" || !draggingRef.current) return;
    spawnPointerParticles(e.clientX, e.clientY);
  };

  const handleScreenPointerUp = () => {
    draggingRef.current = false;
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    playerRef.current?.destroy();
  }, []);

  const isOpen = phase === "open";
  const isOpening = phase === "opening" || phase === "open";

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center bg-background overflow-hidden relative select-none"
      onPointerDown={phase === "closed" ? handleScreenPointerDown : undefined}
      onPointerMove={phase === "closed" ? handleScreenPointerMove : undefined}
      onPointerUp={handleScreenPointerUp}
      onPointerCancel={handleScreenPointerUp}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(320 90% 58%) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(205 85% 45%) 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] right-[10%] w-[30vw] h-[30vw] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(270 70% 55%) 0%, transparent 70%)" }} />
      </div>

      {/* Falling particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {fallingItems.map((item) => (
          <FallingItem key={item.id} item={item} />
        ))}
      </div>

      {/* Floating bg particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles_bg.map((p) => (
          <motion.div
            key={p.id}
            className="absolute text-primary"
            style={{ left: p.left, top: p.top, opacity: p.opacity, fontSize: `${10 + p.scale * 12}px` }}
            animate={{ y: [-8, 8, -8], opacity: [p.opacity, p.opacity * 2, p.opacity] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            {p.shape}
          </motion.div>
        ))}
      </div>

      {/* Intro screen */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cursor-pointer"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            onClick={handleIntroClick}
          >
            {/* Center glow */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[500px] h-[500px] rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, hsl(320 90% 58%) 0%, transparent 65%)" }} />
            </div>

            <div className="relative flex flex-col items-center gap-5 px-8 text-center">
              {/* TV Girl style top label */}
              <motion.div
                className="flex items-center gap-3"
                style={{ color: "hsl(205 85% 60%)" }}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                <div className="w-10 h-px" style={{ background: "hsl(205 85% 60%" }} />
                <span className="text-xs tracking-[0.4em] uppercase font-mono">◆</span>
                <div className="w-10 h-px" style={{ background: "hsl(205 85% 60%)" }} />
              </motion.div>

              {/* Small label */}
              <motion.p
                className="font-mono text-xs tracking-[0.3em] uppercase text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                Con Amor
              </motion.p>

              {/* Main title — fuchsia glow */}
              <motion.h1
                className="font-handwriting text-6xl md:text-7xl leading-tight"
                style={{
                  color: "hsl(320 90% 65%)",
                  textShadow: "0 0 30px hsl(320 90% 58% / 0.6), 0 0 60px hsl(320 90% 58% / 0.3)"
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.9, ease: "easeOut" }}
              >
                Para mi amor
              </motion.h1>

              {/* Stars row */}
              <motion.div
                className="flex gap-3"
                style={{ color: "hsl(320 90% 58%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6, 1] }}
                transition={{ delay: 1.1, duration: 1.2 }}
              >
                <span className="text-xs">★</span>
                <span className="text-sm">♥</span>
                <span className="text-xs">★</span>
              </motion.div>

              {/* CTA button */}
              <motion.div
                className="flex flex-col items-center gap-1 mt-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.7 }}
              >
                <motion.div
                  className="px-8 py-2.5 rounded-full font-mono text-sm tracking-widest uppercase"
                  style={{
                    border: "1px solid hsl(320 90% 58% / 0.5)",
                    color: "hsl(320 90% 65%)",
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 0px hsl(320 90% 58% / 0)",
                      "0 0 20px hsl(320 90% 58% / 0.4), inset 0 0 10px hsl(320 90% 58% / 0.1)",
                      "0 0 0px hsl(320 90% 58% / 0)"
                    ]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 2 }}
                >
                  Toca para abrir
                </motion.div>
              </motion.div>

              {/* Bottom label */}
              <motion.div
                className="flex items-center gap-3 mt-1"
                style={{ color: "hsl(205 85% 60% / 0.5)" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                <div className="w-10 h-px" style={{ background: "hsl(205 85% 60% / 0.4)" }} />
                <span className="font-mono text-xs">◆</span>
                <div className="w-10 h-px" style={{ background: "hsl(205 85% 60% / 0.4)" }} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden YouTube player */}
      <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
        <div ref={playerElRef} />
      </div>

      {/* Music toggle button */}
      <motion.button
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white text-base backdrop-blur-sm"
        style={{
          background: "hsl(320 90% 58% / 0.85)",
          border: "1px solid hsl(320 90% 80% / 0.3)",
          boxShadow: "0 0 15px hsl(320 90% 58% / 0.4)"
        }}
        onClick={toggleMusic}
        title={musicPlaying ? "Pausar música" : "Reproducir música"}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {musicPlaying ? "♪" : "♩"}
      </motion.button>

      {/* Music hint */}
      <AnimatePresence>
        {!musicStartedRef.current && (
          <motion.p
            className="fixed bottom-16 right-3 text-[11px] font-mono italic pointer-events-none"
            style={{ color: "hsl(205 85% 60% / 0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2 }}
          >
            toca para la música
          </motion.p>
        )}
      </AnimatePresence>

      {/* Touch particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {particles.map((particle) =>
            particle.pieces.map((piece, j) => {
              const rad = (piece.angle * Math.PI) / 180;
              const tx = Math.cos(rad) * piece.distance;
              const ty = Math.sin(rad) * piece.distance;
              return (
                <motion.span
                  key={`${particle.id}-${j}`}
                  className="absolute font-serif leading-none"
                  style={{
                    left: particle.x,
                    top: particle.y,
                    fontSize: piece.size,
                    color: piece.color,
                    x: "-50%",
                    y: "-50%",
                    filter: `drop-shadow(0 0 4px ${piece.color})`,
                  }}
                  initial={{ opacity: 1, scale: 0, x: "-50%", y: "-50%" }}
                  animate={{
                    opacity: 0,
                    scale: [0, 1.2, 0.9],
                    x: `calc(-50% + ${tx}px)`,
                    y: `calc(-50% + ${ty}px)`,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.2, 0.8, 0.4, 1] }}
                >
                  {piece.shape}
                </motion.span>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Envelope — dark with fuchsia/blue accents */}
      <div className="relative z-10 w-full max-w-[340px]" style={{ perspective: "1000px" }}>
        <div
          className="relative w-full aspect-[3/2] cursor-pointer"
          onClick={(e) => { e.stopPropagation(); handleEnvelopeClick(); }}
        >
          {/* Envelope body */}
          <div className="absolute inset-0 rounded-xl shadow-2xl"
            style={{
              background: "hsl(230 25% 13%)",
              border: "1px solid hsl(320 90% 58% / 0.3)",
              boxShadow: "0 0 30px hsl(320 90% 58% / 0.2), 0 0 60px hsl(205 85% 45% / 0.1)"
            }} />

          {/* Envelope flaps */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 rounded-xl"
              style={{
                background: "hsl(230 25% 11%)",
                clipPath: "polygon(0 0, 50% 50%, 0 100%)"
              }} />
            <div className="absolute inset-0 rounded-xl"
              style={{
                background: "hsl(230 25% 11%)",
                clipPath: "polygon(100% 0, 100% 100%, 50% 50%)"
              }} />
            <div className="absolute inset-0 rounded-xl"
              style={{
                background: "hsl(230 25% 12%)",
                clipPath: "polygon(0 100%, 50% 48%, 100% 100%)"
              }} />
          </div>

          {/* Fuchsia border glow line */}
          <div className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, hsl(320 90% 58% / 0.15) 0%, transparent 50%, hsl(205 85% 45% / 0.1) 100%)"
            }} />

          {/* Envelope flap (animated) */}
          <motion.div
            className="absolute top-0 left-0 w-full h-full origin-top z-20 pointer-events-none"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateX: isOpening ? -175 : 0 }}
            transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className="absolute top-0 left-0 w-full h-[55%] rounded-t-xl"
              style={{
                background: "hsl(230 25% 15%)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                borderTop: "1px solid hsl(320 90% 58% / 0.2)"
              }}
            >
              {/* Wax seal style center ornament */}
              <div className="absolute" style={{ bottom: "18%", left: "50%", transform: "translateX(-50%)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "hsl(320 90% 58%)",
                    boxShadow: "0 0 12px hsl(320 90% 58% / 0.6)"
                  }}>
                  <span className="text-white text-sm">♥</span>
                </div>
              </div>
            </div>
          </motion.div>

          {phase === "closed" && (
            <motion.p
              className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-xs font-mono italic whitespace-nowrap pointer-events-none tracking-widest uppercase"
              style={{ color: "hsl(320 90% 65% / 0.7)" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              Haz clic para abrir
            </motion.p>
          )}
        </div>
      </div>

      {/* Letter overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          >
            <div className="absolute inset-0 backdrop-blur-sm"
              style={{ background: "hsl(230 25% 7% / 0.7)" }} />

            <motion.div
              className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl z-10"
              style={{
                background: "hsl(230 22% 10%)",
                border: "1px solid hsl(320 90% 58% / 0.3)",
                boxShadow: "0 0 40px hsl(320 90% 58% / 0.2), 0 0 80px hsl(205 85% 45% / 0.1)"
              }}
              initial={{ y: 60, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top neon bar */}
              <div className="w-full h-[3px] rounded-t-2xl"
                style={{ background: "linear-gradient(90deg, hsl(205 85% 55%), hsl(320 90% 58%), hsl(270 70% 60%), hsl(205 85% 55%))" }} />

              <div className="px-6 pb-8 pt-4 flex flex-col items-center">
                {/* Corner ornaments */}
                <div className="absolute top-6 left-4 text-2xl select-none font-mono"
                  style={{ color: "hsl(320 90% 58% / 0.4)" }}>★</div>
                <div className="absolute top-6 right-4 text-2xl select-none font-mono"
                  style={{ color: "hsl(205 85% 60% / 0.4)" }}>★</div>

                {/* Photo */}
                <div className="mt-2 mb-5 relative">
                  <div className="w-44 h-44 rounded-full overflow-hidden border-4 shadow-lg"
                    style={{
                      borderColor: "hsl(320 90% 58%)",
                      boxShadow: "0 0 20px hsl(320 90% 58% / 0.4), 0 0 40px hsl(320 90% 58% / 0.2)"
                    }}>
                    <img src="/couple.jpg" alt="Nosotros" className="w-full h-full object-cover object-top" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    <span className="text-xs" style={{ color: "hsl(320 90% 65%)" }}>♥</span>
                    <span className="text-xs" style={{ color: "hsl(205 85% 60%)" }}>★</span>
                    <span className="text-xs" style={{ color: "hsl(320 90% 65%)" }}>♥</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 w-full mb-5">
                  <div className="flex-1 h-px" style={{ background: "hsl(320 90% 58% / 0.2)" }} />
                  <span className="text-sm" style={{ color: "hsl(320 90% 58% / 0.5)" }}>♥</span>
                  <div className="flex-1 h-px" style={{ background: "hsl(320 90% 58% / 0.2)" }} />
                </div>

                {/* Letter text */}
                <div className="w-full text-center space-y-4">
                  <p className="font-handwriting text-[1.25rem] leading-relaxed"
                    style={{ color: "hsl(40 20% 82%)" }}>
                    Hola, buenas noches, tardes, días, mañanas, espero que te encuentres igual de hermosa como siempre, aunque sé que lo estás, así digas que no estés arreglada o maquillada, ya que sin o con todas esas cosas te sigo viendo igual de hermosa, lo único que puedes hacer es volverte cada vez más hermosa, más y más, a tal punto que no hay comparación.
                  </p>

                  <div className="text-base select-none font-mono"
                    style={{ color: "hsl(205 85% 60% / 0.5)" }}>— ◆ —</div>

                  <p className="font-handwriting text-[1.25rem] leading-relaxed"
                    style={{ color: "hsl(40 20% 82%)" }}>
                    Una bella mujer, tan majestuosa, llena de amor, llena de todo eso que no logro comprender, lo único que logro entender de eso es que hace que me enamore más de ti. Es raro, el hecho de que no encuentre una explicación para que mi amor por ti crezca, con solo tu mera existencia es posible eso, que haya más y más amor, que mis días se iluminen, aún en la oscuridad, incluso en la espesa niebla, siempre serás eso que ilumina mi camino, mi mundo.
                  </p>

                  <div className="text-base select-none font-mono"
                    style={{ color: "hsl(205 85% 60% / 0.5)" }}>— ◆ —</div>

                  <p className="font-handwriting text-[1.25rem] leading-relaxed"
                    style={{ color: "hsl(40 20% 82%)" }}>
                    No sé si decirte Feliz cumpleaños, o si decirte Feliz mes mi amor, solo sé que estoy agradecido con la vida por haberme traído a la mujer de mis sueños, la mujer que tanto anhelé, quiero tenerte para siempre, aún en la vida como en la muerte.
                  </p>

                  <div className="text-base select-none font-mono"
                    style={{ color: "hsl(205 85% 60% / 0.5)" }}>— ◆ —</div>

                  <p className="font-handwriting text-[1.35rem] leading-relaxed font-semibold"
                    style={{
                      color: "hsl(320 90% 70%)",
                      textShadow: "0 0 20px hsl(320 90% 58% / 0.4)"
                    }}>
                    Feliz cumpleaños, sé que todos tus sueños se harán realidad, porque confío en ti y más que nadie estaré celebrando todos y cada uno de tus logros.
                  </p>

                  <div className="pt-4 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 h-px" style={{ background: "hsl(320 90% 58% / 0.2)" }} />
                      <span className="text-sm" style={{ color: "hsl(320 90% 58% / 0.5)" }}>♥</span>
                      <div className="flex-1 h-px" style={{ background: "hsl(320 90% 58% / 0.2)" }} />
                    </div>
                    <p className="font-handwriting text-2xl mt-2"
                      style={{
                        color: "hsl(320 90% 65%)",
                        textShadow: "0 0 20px hsl(320 90% 58% / 0.5)"
                      }}>
                      Te amo inmensamente.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 select-none">
                  <span className="font-mono text-lg" style={{ color: "hsl(320 90% 58% / 0.4)" }}>★</span>
                  <span className="font-mono text-sm" style={{ color: "hsl(205 85% 60% / 0.4)" }}>◆</span>
                  <span className="font-mono text-lg" style={{ color: "hsl(320 90% 58% / 0.4)" }}>★</span>
                </div>

                <button
                  className="mt-5 px-7 py-2 rounded-full font-mono text-sm tracking-widest uppercase transition-all"
                  style={{
                    border: "1px solid hsl(320 90% 58% / 0.3)",
                    color: "hsl(40 15% 60%)",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = "hsl(320 90% 58% / 0.7)";
                    (e.target as HTMLButtonElement).style.color = "hsl(320 90% 65%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = "hsl(320 90% 58% / 0.3)";
                    (e.target as HTMLButtonElement).style.color = "hsl(40 15% 60%)";
                  }}
                  onClick={handleClose}
                >
                  Cerrar carta
                </button>
              </div>

              {/* Bottom neon bar */}
              <div className="w-full h-[3px] rounded-b-2xl"
                style={{ background: "linear-gradient(90deg, hsl(205 85% 55%), hsl(320 90% 58%), hsl(270 70% 60%), hsl(205 85% 55%))" }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
