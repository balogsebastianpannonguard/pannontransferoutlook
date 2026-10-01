"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type State = "login" | "done";

export default function DispatcherPremiumLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State>("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Kérjük, adja meg az e-mail címet és a jelszót.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setError(json?.message || "Sikertelen bejelentkezés.");
        return;
      }

      if (json?.user) {
        setState("done");
        setTimeout(() => {
          router.push("/");
        }, 1800);
        return;
      }

      setError("Váratlan hiba történt a bejelentkezés során.");
    } catch {
      setError("Hálózati hiba történt. Kérjük, próbálja újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-root relative flex min-h-dvh flex-col overflow-hidden text-white selection:bg-[#0f6cbd] selection:text-white">
      {/* Háttér: mély éjkék, finom fények és szemcse */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="lg-orb absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#0f6cbd]/25 blur-[110px]" />
        <div className="lg-orb absolute -right-24 bottom-10 h-[260px] w-[260px] rounded-full bg-[#d4af37]/10 blur-[90px] [animation-delay:-4s]" />
        <div className="lg-grain absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Fejléc */}
      <header className="relative z-10 flex justify-center px-6 pt-[calc(env(safe-area-inset-top)+44px)]">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-gradient-to-br from-[#2b88d8] via-[#0f6cbd] to-[#0a3f75] shadow-[0_18px_40px_-12px_rgba(15,108,189,0.8)] ring-1 ring-white/15">
            <span className="font-serif text-[28px] font-bold leading-none tracking-tight">P</span>
            <div className="lg-gold absolute -right-1 -bottom-1 h-[18px] w-[18px] rounded-full ring-[3px] ring-[#060a13]" />
          </div>
          <span className="font-serif text-[19px] font-bold tracking-wide">Pannon Transfer</span>
          <span className="mt-1.5 text-[10px] font-semibold tracking-[0.32em] text-white/45 uppercase">Vezetői naptár</span>
        </motion.div>
      </header>

      {/* Tartalom */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-[400px]">
          <AnimatePresence mode="wait">
            {state === "login" && (
              <motion.div
                key="card-login"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                className="lg-card relative rounded-[28px] border border-white/10 px-6 pt-8 pb-7 sm:px-8"
              >
                <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
                  <div className="mb-8 text-center">
                    <h1 className="font-serif text-[30px] leading-tight font-bold tracking-tight">Üdvözöljük</h1>
                    <div className="lg-gold mx-auto mt-3.5 mb-4 h-[2px] w-10 rounded-full" />
                    <p className="text-[14px] leading-relaxed text-white/55">Jelentkezzen be a menetrend megtekintéséhez.</p>
                  </div>

                  <div className="mb-6 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="lg-email" className="ml-1 text-[11px] font-semibold tracking-[0.14em] text-white/50 uppercase">
                        E-mail cím
                      </label>
                      <div
                        className={cn(
                          "relative flex items-center rounded-2xl border bg-white/[0.06] transition-all duration-300",
                          error
                            ? "border-red-400/40 bg-red-500/[0.08]"
                            : "border-white/10 focus-within:border-[#2b88d8]/70 focus-within:bg-white/[0.09] focus-within:ring-4 focus-within:ring-[#0f6cbd]/25"
                        )}
                      >
                        <Mail className={cn("absolute left-4 h-[18px] w-[18px] transition-colors", error ? "text-red-300" : "text-white/40")} />
                        <input
                          id="lg-email"
                          type="email"
                          inputMode="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="nev@pannonguard.hu"
                          className="h-[54px] w-full bg-transparent pr-4 pl-12 text-[16px] font-medium text-white outline-none placeholder:text-white/25"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="lg-password" className="ml-1 text-[11px] font-semibold tracking-[0.14em] text-white/50 uppercase">
                        Jelszó
                      </label>
                      <div
                        className={cn(
                          "relative flex items-center rounded-2xl border bg-white/[0.06] transition-all duration-300",
                          error
                            ? "border-red-400/40 bg-red-500/[0.08]"
                            : "border-white/10 focus-within:border-[#2b88d8]/70 focus-within:bg-white/[0.09] focus-within:ring-4 focus-within:ring-[#0f6cbd]/25"
                        )}
                      >
                        <Lock className={cn("absolute left-4 h-[18px] w-[18px] transition-colors", error ? "text-red-300" : "text-white/40")} />
                        <input
                          id="lg-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="••••••••"
                          className="h-[54px] w-full bg-transparent pr-12 pl-12 text-[16px] font-medium text-white outline-none placeholder:text-white/25"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white active:scale-90"
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-7 flex items-center justify-between gap-3 px-1">
                    <label className="group flex cursor-pointer items-center gap-2.5">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only" />
                      <span
                        className={cn(
                          "flex h-[20px] w-[20px] items-center justify-center rounded-md border transition-all duration-300",
                          remember ? "border-[#2b88d8] bg-[#0f6cbd] shadow-[0_2px_10px_rgba(15,108,189,0.6)]" : "border-white/25 bg-white/[0.04] group-hover:border-white/45"
                        )}
                        aria-hidden="true"
                      >
                        {remember && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-[12.5px] whitespace-nowrap font-medium text-white/60 select-none">Maradjon belépve 3 napig</span>
                    </label>
                    <a
                      href="mailto:dispecer@pannon.hu?subject=Jelsz%F3%20vissza%E1ll%EDt%E1s"
                      className="shrink-0 text-[13px] font-semibold text-[#6cb4f2] transition-colors hover:text-white"
                    >
                      Elfelejtette?
                    </a>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-5 overflow-hidden"
                      >
                        <div className="flex items-center gap-2.5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" />
                          <p className="text-[13px] font-medium text-red-200">{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="lg-btn group relative flex h-[56px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[16px] font-semibold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Belépés
                          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </motion.div>
            )}

            {state === "done" && (
              <motion.div
                key="card-done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center p-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
                  className="lg-btn mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full"
                >
                  <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-1 font-serif text-[26px] font-bold"
                >
                  Hitelesítve
                </motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-[14px] text-white/50">
                  A naptár betöltése…
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="mt-6 h-[2px] w-20 overflow-hidden rounded-full bg-white/10"
                >
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    className="lg-gold h-full w-full"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="relative z-10 flex justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] text-[11px] font-medium tracking-[0.12em] text-white/30 uppercase">
        <span>© {new Date().getFullYear()} Pannon Transfer Zrt.</span>
      </footer>
    </div>
  );
}
