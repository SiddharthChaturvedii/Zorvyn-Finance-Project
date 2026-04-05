"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please provide Gateway Identity and Access Token.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;

      // 1. Save to Zustand store (handles local persistence automatically)
      setAuth(data.user, data.accessToken, data.refreshToken);

      // Redirect into the core dashboard upon clear success
      router.push("/dashboard");
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "Secure connection compromised. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden selection:bg-accent selection:text-white">
      {/* Subtle background grid effect */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* 3D Fintech Element (Left Logo) */}
      <div className="absolute hidden lg:flex items-center justify-center w-64 h-64 left-16 xl:left-32 top-1/2 -translate-y-1/2 pointer-events-none z-0" style={{ perspective: '1000px' }}>
        <div className="relative w-48 h-48 animate-3d-spin">
          <svg viewBox="0 0 100 100" className="w-full h-full text-text-main/60 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            <path d="M10,45 C30,55 70,40 60,15 C55,30 35,45 10,45 Z" fill="currentColor"/>
            <path d="M90,55 C70,45 30,60 40,85 C45,70 65,55 90,55 Z" fill="currentColor"/>
          </svg>
        </div>
      </div>

      {/* 3D Fintech Element (Right Logo) */}
      <div className="absolute hidden lg:flex items-center justify-center w-64 h-64 right-16 xl:right-32 top-1/2 -translate-y-1/2 pointer-events-none z-0" style={{ perspective: '1000px' }}>
        <div className="relative w-48 h-48 animate-3d-spin" style={{ animationDelay: '-10s' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full text-text-main/60 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            <path d="M10,45 C30,55 70,40 60,15 C55,30 35,45 10,45 Z" fill="currentColor"/>
            <path d="M90,55 C70,45 30,60 40,85 C45,70 65,55 90,55 Z" fill="currentColor"/>
          </svg>
        </div>
      </div>
      
      {/* Heavy obsidian container */}
      <div className="z-10 w-full max-w-md bg-surface border border-sculpted p-8 rounded-lg shadow-2xl relative">
        {/* Glow beneath the top of the card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-accent/30 shadow-neon"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-surface-raised border border-sculpted rounded flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-main text-center font-sans">
            ZORVYN <span className="font-light text-text-dim">FINANCE</span>
          </h1>
          <p className="text-text-dim text-sm mt-2">Institutional-grade ledger access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-negative/10 border border-negative/50 text-negative px-4 py-3 rounded text-sm flex items-start gap-3 mb-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-dim uppercase tracking-wider font-sans">
              Gateway Identity
            </label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@zorvyn.com"
              className="w-full bg-surface-raised border border-sculpted text-text-main text-sm p-3 rounded focus:outline-none focus:border-accent focus:shadow-[inset_0_0_0_1px_var(--color-accent)] transition-all font-mono placeholder:text-text-dim/50"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-dim uppercase tracking-wider font-sans">
                Access Token
              </label>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-raised border border-sculpted text-text-main text-sm p-3 rounded focus:outline-none focus:border-accent focus:shadow-[inset_0_0_0_1px_var(--color-accent)] transition-all font-mono placeholder:text-text-dim/50"
              disabled={loading}
            />
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full relative group flex items-center justify-center gap-2 bg-accent-gradient hover:shadow-neon text-white font-medium py-3 px-4 rounded transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-sculpted pt-6">
          <p className="text-sm font-semibold text-text-main mb-1 text-center font-sans tracking-tight">Provisioned Access Profiles</p>
          <p className="text-[10px] text-text-dim mb-4 text-center leading-tight">System roles are statically linked to exact Gateway Identities. Select a preset configuration.</p>
          
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center bg-surface-raised border border-sculpted p-2 rounded">
              <div><span className="text-accent font-bold">ADMIN:</span> admin@zorvyn.io</div>
              <div className="text-text-dim text-[10px]">P: Admin@123456</div>
              <button type="button" onClick={() => { setEmail('admin@zorvyn.io'); setPassword('Admin@123456'); }} className="hover:text-accent font-sans ml-2">→</button>
            </div>
            <div className="flex justify-between items-center bg-surface-raised border border-sculpted p-2 rounded">
              <div><span className="text-[#a460ff] font-bold">ANALYST:</span> analyst@zorvyn.io</div>
              <div className="text-text-dim text-[10px]">P: Analyst@123</div>
              <button type="button" onClick={() => { setEmail('analyst@zorvyn.io'); setPassword('Analyst@123'); }} className="hover:text-accent font-sans ml-2">→</button>
            </div>
            <div className="flex justify-between items-center bg-surface-raised border border-sculpted p-2 rounded">
              <div><span className="text-positive font-bold">VIEWER:</span> viewer@zorvyn.io</div>
              <div className="text-text-dim text-[10px]">P: Viewer@123</div>
              <button type="button" onClick={() => { setEmail('viewer@zorvyn.io'); setPassword('Viewer@123'); }} className="hover:text-accent font-sans ml-2">→</button>
            </div>
            <div className="flex justify-between items-center bg-surface-raised/30 border border-sculpted/50 p-2 rounded opacity-50">
              <div><span className="text-negative font-bold">EXEC:</span> No frontend portal access</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="#" className="text-xs text-text-dim hover:text-accent transition-colors underline underline-offset-4 decoration-border-subtle cursor-pointer">
            Request Provisioning
          </a>
        </div>
      </div>
      
      {/* Decorative environment elements */}
      <div className="absolute bottom-8 text-xs font-mono text-text-dim/40 flex justify-between w-full max-w-4xl px-8 z-0">
        <span>sys.zorvyn.net</span>
        <span>NODE: V-091A</span>
      </div>
    </main>
  );
}
