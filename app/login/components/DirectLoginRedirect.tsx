"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Rendered only when /login is visited with a valid ?token= direct-login link.
 * Automatically authenticates on mount and redirects — no form, no click needed.
 * Falls back to the normal login page if the request fails for any reason.
 */
export default function DirectLoginRedirect({ token }: { token: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/direct-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json?.success) {
          window.location.href = "/";
          return;
        }
      } catch {
        // ignore, fall through to failed state below
      }
      if (!cancelled) setFailed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (failed) {
      window.location.href = "/login";
    }
  }, [failed]);

  return (
    <div className="lg-root relative flex min-h-dvh items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-gradient-to-br from-[#2b88d8] via-[#0f6cbd] to-[#0a3f75] shadow-[0_18px_40px_-12px_rgba(15,108,189,0.8)] ring-1 ring-white/15">
          <span className="font-serif text-[28px] font-bold leading-none">P</span>
          <div className="lg-gold absolute -right-1 -bottom-1 h-[18px] w-[18px] rounded-full ring-[3px] ring-[#060a13]" />
        </div>
        <Loader2 className="mt-2 h-6 w-6 animate-spin text-white/60" />
        <p className="text-[13px] font-medium tracking-wide text-white/50">
          Bejelentkezés...
        </p>
      </div>
    </div>
  );
}
