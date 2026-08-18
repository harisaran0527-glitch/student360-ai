"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, ArrowRight, Cpu, Database, Server } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";

interface Node3D {
  x: number;
  y: number;
  z: number;
  lobe: 'L' | 'R' | 'S';
  phase: number;
}

interface BackgroundParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
  angle: number;
}

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // High-fidelity animation timeline states
  const [anim, setAnim] = useState({
    grid: false,
    particles: false,
    brainStart: false,
    brainComplete: false,
    sideCards: false,
    platform: false,
    centerCard: false,
    title: false,
    email: false,
    password: false,
    controls: false,
    button: false,
    finished: false
  });

  const [loginSuccess, setLoginSuccess] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Mouse move event for parallax effect (starts after 2s)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 15; // subtle displacement
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Precise entrance animation timeline (10–12 seconds sequence)
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setAnim({
        grid: true,
        particles: true,
        brainStart: true,
        brainComplete: true,
        sideCards: true,
        platform: true,
        centerCard: true,
        title: true,
        email: true,
        password: true,
        controls: true,
        button: true,
        finished: true
      });
      return;
    }

    // 0–2 sec: Grid, particles fade in, brain starts forming
    const t0 = setTimeout(() => {
      setAnim(prev => ({ ...prev, grid: true, particles: true, brainStart: true }));
    }, 100);

    // 2–4 sec: Brain completes, side cards slide in
    const t2 = setTimeout(() => {
      setAnim(prev => ({ ...prev, brainComplete: true, sideCards: true }));
    }, 2000);

    // 4–6 sec: Platform activates, center card rises
    const t4 = setTimeout(() => {
      setAnim(prev => ({ ...prev, platform: true, centerCard: true }));
    }, 4000);

    // 6–8 sec: Form inputs ripple in
    const t6 = setTimeout(() => {
      setAnim(prev => ({ ...prev, title: true }));
    }, 6000);

    const t65 = setTimeout(() => {
      setAnim(prev => ({ ...prev, email: true }));
    }, 6500);

    const t7 = setTimeout(() => {
      setAnim(prev => ({ ...prev, password: true }));
    }, 7000);

    const t75 = setTimeout(() => {
      setAnim(prev => ({ ...prev, controls: true }));
    }, 7500);

    // 8–10 sec: Button appears, settling
    const t8 = setTimeout(() => {
      setAnim(prev => ({ ...prev, button: true }));
    }, 8000);

    // 10–12 sec: Entrance finishes, fully interactive
    const t10 = setTimeout(() => {
      setAnim(prev => ({ ...prev, finished: true }));
    }, 10000);

    return () => {
      clearTimeout(t0);
      clearTimeout(t2);
      clearTimeout(t4);
      clearTimeout(t6);
      clearTimeout(t65);
      clearTimeout(t7);
      clearTimeout(t75);
      clearTimeout(t8);
      clearTimeout(t10);
    };
  }, []);

  // Holographic neural brain and background particles rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Create 3D brain node coordinates
    const nodes: Node3D[] = [];
    const lobeCount = 50;
    for (let i = 0; i < lobeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 52 + Math.random() * 22;
      const isLeft = i < lobeCount / 2;
      const lobeX = isLeft ? -42 : 42;

      let x = r * Math.sin(phi) * Math.cos(theta) + lobeX;
      let y = r * Math.sin(phi) * Math.sin(theta) - 15;
      let z = r * Math.cos(phi);

      if (y < -35) {
        x *= 0.75;
        z *= 0.75;
      }
      if (y > 10) {
        y *= 0.6;
      }
      nodes.push({
        x,
        y,
        z,
        lobe: isLeft ? 'L' : 'R',
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Stem points
    const stemCount = 15;
    for (let i = 0; i < stemCount; i++) {
      const y = 30 + Math.random() * 35;
      const radius = 22 * (1 - (y - 30) / 45);
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * radius + (Math.random() - 0.5) * 3;
      const z = Math.sin(theta) * radius + (Math.random() - 0.5) * 3;
      nodes.push({
        x,
        y,
        z,
        lobe: 'S',
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Background floating particles
    const particles: BackgroundParticle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.0003 + Math.random() * 0.0004,
        size: 0.7 + Math.random() * 1.3,
        angle: Math.random() * Math.PI * 2,
      });
    }

    const ctx = canvas.getContext("2d");

    const render = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const elapsed = anim.finished ? 10.0 : (Date.now() - startTimeRef.current) / 1000;

      // 1. Draw floating ambient particles (Step 0+)
      if (anim.particles) {
        const particlesOpacity = Math.min(1, elapsed / 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.15 * particlesOpacity})`;
        particles.forEach((p) => {
          p.y -= p.speed;
          p.x += Math.sin(p.angle + Date.now() * 0.0008) * 0.00015;
          if (p.y < 0) {
            p.y = 1;
            p.x = Math.random();
          }
          ctx.beginPath();
          ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Draw neural brain hologram (Step 0+)
      if (anim.brainStart) {
        // Build progress: nodes assemble over 0-4 seconds
        const buildProgress = anim.finished ? 1.0 : Math.min(1, elapsed / 4.0);
        const nodeLimit = Math.floor(nodes.length * buildProgress);

        // Rotation angles
        const angle = Date.now() * 0.0002;
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        // Project nodes
        const projected = nodes.slice(0, nodeLimit).map((node) => {
          const rx = node.x * cosAngle - node.z * sinAngle;
          const rz = node.x * sinAngle + node.z * cosAngle;
          const centerX = width / 2;
          const centerY = height * 0.38;
          return {
            px: rx + centerX,
            py: node.y + centerY,
            rz,
            lobe: node.lobe,
            phase: node.phase,
          };
        });

        // Draw connections (only after 1s, fully lighting up by 4s)
        const lineOpacityFactor = anim.finished ? 1.0 : Math.max(0, Math.min(1, (elapsed - 1) / 3.0));
        if (lineOpacityFactor > 0 && projected.length > 1) {
          ctx.lineWidth = 0.5;
          for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < projected.length; j++) {
              const n1 = nodes[i];
              const n2 = nodes[j];

              // Distance check
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dz = n1.z - n2.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

              if (dist < 46) {
                if (n1.lobe !== n2.lobe && n1.lobe !== 'S' && n2.lobe !== 'S' && dist > 35) {
                  continue;
                }
                const p1 = projected[i];
                const p2 = projected[j];

                // Glow pulse
                const pulse = 0.4 + 0.6 * Math.sin(Date.now() * 0.001 + n1.phase);
                const opacity = (1 - dist / 46) * 0.16 * pulse * lineOpacityFactor;

                ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.stroke();
              }
            }
          }
        }

        // Draw nodes
        projected.forEach((node) => {
          const pulse = 0.3 + 0.7 * Math.sin(Date.now() * 0.0018 + node.phase);
          const size = (1.5 + node.rz / 75) * pulse * buildProgress;
          if (size <= 0) return;

          let color = "rgba(6, 182, 212, 0.75)"; // Cyan (left lobe)
          if (node.lobe === 'R') color = "rgba(168, 85, 247, 0.75)"; // Purple (right lobe)
          if (node.lobe === 'S') color = "rgba(99, 102, 241, 0.75)"; // Indigo (stem)

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.px, node.py, Math.max(0.5, size), 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [anim.particles, anim.brainStart, anim.finished]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Invalid email or password.");
      }

      setPassword("");
      setLoginSuccess(true);
      
      setTimeout(() => {
        window.location.href = "/admin/master-records";
      }, 1600);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030611] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      <style>{`
        @keyframes stroke-circle {
          0% { stroke-dasharray: 0 158; }
          100% { stroke-dasharray: 158 158; }
        }
        @keyframes stroke-check {
          0% { stroke-dasharray: 0 50; stroke-dashoffset: 50; }
          100% { stroke-dasharray: 50 50; stroke-dashoffset: 0; }
        }
        .success-circle {
          stroke-dasharray: 158;
          stroke-dashoffset: 158;
          animation: stroke-circle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .success-check {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: stroke-check 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
        }
      `}</style>

      {/* Background Glow Lights (Parallax linked) */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-cyan-950/10 rounded-full blur-[140px] pointer-events-none ambient-glow-1 transition-transform duration-[600ms] ease-out" 
        style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-purple-950/10 rounded-full blur-[140px] pointer-events-none ambient-glow-2 transition-transform duration-[600ms] ease-out" 
        style={{ transform: `translate(${mousePos.x * -0.4}px, ${mousePos.y * -0.4}px)` }}
      />

      {/* Scrolling Grid Floor with entrance fade in */}
      <div className={`absolute inset-0 futuristic-grid pointer-events-none transition-all duration-[2000ms] ${
        anim.grid ? "opacity-60 scale-100" : "opacity-0 scale-110"
      }`} />

      {/* Canvas Renderer for Brain Hologram (Parallax linked) */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 transition-transform duration-[600ms] ease-out"
        style={{ transform: `translate(${mousePos.x * 0.7}px, ${mousePos.y * 0.7}px)` }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-8 z-10">
        
        {/* Left Information Card */}
        <div className={`hidden lg:flex flex-col w-[260px] glass-futuristic p-5 rounded-2xl border border-cyan-500/15 shadow-lg shadow-cyan-950/20 transition-all duration-[1500ms] ease-out ${
          anim.sideCards ? "translate-x-0 opacity-100" : "-translate-x-32 opacity-0 pointer-events-none"
        }`}>
          <div className="flex items-center gap-2 mb-3 text-cyan-400">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-neon-cyan uppercase">Neural Core Engine</span>
          </div>
          <div className="space-y-3 font-mono text-[10px] text-slate-400">
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
              <span className="text-slate-500">ENGINE STATUS:</span>
              <span className="text-emerald-400 ml-1.5 font-bold">ONLINE</span>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
              <span className="text-slate-500">SYNAPSE LAYER:</span>
              <span className="text-cyan-400 ml-1.5 font-semibold">ACTIVE (50-N)</span>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
              <span className="text-slate-500">LEARNING RATIO:</span>
              <span className="text-indigo-400 ml-1.5">0.0021 loss</span>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80 flex flex-col gap-1">
              <span className="text-slate-500">TRAINING FEEDBACK:</span>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-cyan-500 h-full w-[84%] animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Center Login Section */}
        <div className="relative flex flex-col justify-center items-center w-full max-w-[420px] mx-auto">
          
          {/* Holographic Circular Platform under the Card */}
          <div className={`w-[360px] h-[360px] rounded-full border border-cyan-500/15 border-dashed absolute bottom-[-180px] left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-[2000ms] animate-platform-spin ${
            anim.platform ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`} />
          <div className={`w-[290px] h-[290px] rounded-full border border-purple-500/20 border-dashed absolute bottom-[-145px] left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-[2000ms] animate-platform-spin-reverse ${
            anim.platform ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`} />

          {/* Central Login Card (Rises with scale + opacity transition) */}
          <div className={`w-full p-[1.5px] rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/10 to-purple-500/25 transition-all duration-[1500ms] ease-out shadow-2xl ${
            anim.centerCard ? "translate-y-0 opacity-100 scale-100" : "translate-y-28 opacity-0 scale-90 pointer-events-none"
          }`}>
            <div className="glass-futuristic-card p-6 md:p-8 rounded-3xl border border-white/5 relative overflow-hidden w-full shadow-cyan-500/5 shadow-2xl">
              
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.02)_50%)] bg-[size:100%_4px] pointer-events-none" />

              {/* Login Success Overlay */}
              {loginSuccess && (
                <div className="absolute inset-0 bg-[#030611]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.3s_ease-out_forwards]">
                  <svg className="w-14 h-14 text-emerald-400 mb-4" viewBox="0 0 52 52">
                    <circle className="success-circle" cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path className="success-check" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" d="M14 27l7.5 7.5L38 18" />
                  </svg>
                  <h3 className="text-white text-lg font-bold tracking-wide text-neon-green">
                    Login Successful!
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    Redirecting to admin panel...
                  </p>
                  <div className="w-40 bg-slate-800 h-[3px] rounded-full overflow-hidden mt-6">
                    <div className="h-full bg-emerald-500 rounded-full animate-[loading_1.5s_ease-in-out_forwards]" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {/* Card Contents */}
              <div className="relative z-10 flex flex-col">
                
                {/* 1. Header Branding */}
                <div className={`text-center mb-6 transition-all duration-[800ms] ease-out ${
                  anim.title ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
                }`}>
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-600/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/5 mb-3">
                    <Shield className="w-7 h-7 animate-pulse" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Student360 <span className="text-cyan-400 text-neon-cyan">AI</span>
                  </h1>
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mt-1 text-neon-cyan">
                    Admin Portal Login
                  </p>
                </div>

                {/* Error Box */}
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center font-medium shadow-md shadow-rose-950/20 animate-shake">
                    <span className="inline-block mr-1">⚠️</span> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 font-sans" autoComplete="off">
                  
                  {/* 2. Username/Email Field */}
                  <div className={`transition-all duration-[800ms] ease-out ${
                    anim.email ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
                  }`}>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 tracking-wide">
                      Admin Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-cyan-500/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/10 transition placeholder-slate-600 shadow-inner"
                      placeholder="Enter admin email"
                    />
                  </div>

                  {/* 3. Password Input Field */}
                  <div className={`transition-all duration-[800ms] ease-out ${
                    anim.password ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
                  }`}>
                    <PasswordInput
                      label="Admin Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Enter password"
                      inputClassName="bg-slate-950/60 border-slate-800 hover:border-slate-700 focus:border-cyan-500/80 text-white focus:ring-2 focus:ring-cyan-500/10 text-xs py-2.5"
                      labelClassName="text-slate-300 mb-1.5 text-[11px]"
                    />
                  </div>

                  {/* 4. Remember Me and Forgot Password Controls */}
                  <div className={`flex items-center justify-between text-[10px] text-slate-400 transition-all duration-[800ms] ease-out ${
                    anim.controls ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
                  }`}>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition">
                      <input type="checkbox" className="accent-cyan-500 rounded bg-slate-950 border-slate-800" />
                      <span>Remember session</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); alert("For credentials reset, please contact the Department HOD or College Admin."); }}
                      className="hover:text-cyan-400 transition hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* 5. Action Login Button */}
                  <div className={`transition-all duration-[800ms] ease-out ${
                    anim.button ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
                  } pt-2`}>
                    <button
                      type="submit"
                      disabled={loading || !anim.finished}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/10 border border-cyan-400/20 hover:border-cyan-400/30 transition flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-cyan-500/20 active:scale-[0.98] duration-150"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Authenticating System...</span>
                        </>
                      ) : (
                        <>
                          <span>Admin Portal Login</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer notice */}
                <div className={`mt-5 pt-4 border-t border-slate-900 text-center transition-all duration-[1000ms] ${
                  anim.button ? "opacity-100" : "opacity-0"
                }`}>
                  <p className="text-[9px] text-slate-500 font-mono tracking-tight uppercase">
                    Restricted Administration Access — AES 256 Enforced
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Right Information Card */}
        <div className={`hidden lg:flex flex-col w-[260px] glass-futuristic p-5 rounded-2xl border border-purple-500/15 shadow-lg shadow-purple-950/20 transition-all duration-[1500ms] ease-out ${
          anim.sideCards ? "translate-x-0 opacity-100" : "translate-x-32 opacity-0 pointer-events-none"
        }`}>
          <div className="flex items-center gap-2 mb-3 text-purple-400">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-neon-purple uppercase">System Analytics</span>
          </div>
          <div className="space-y-3 font-mono text-[10px] text-slate-400">
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
              <span className="text-slate-500">ACTIVE DB CONNS:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-white font-bold">12 / 100 max</span>
              </div>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
              <span className="text-slate-500">PORTAL LATENCY:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Server className="w-3 h-3 text-cyan-400" />
                <span className="text-white font-bold">14ms (OPTIMAL)</span>
              </div>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
              <span className="text-slate-500">CURRENT HOSTNAME:</span>
              <span className="block text-purple-400 font-bold truncate mt-0.5">student360.ai-ml</span>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-500">BACKUP CYCLE:</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300 font-bold uppercase">Hourly</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
