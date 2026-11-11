import { Shield } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark"><Shield size={19} strokeWidth={2.2} /></div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-[0.01em] text-white">ultimate<span className="text-accent">tunnel</span></div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">Control center</div>
        </div>
      )}
    </div>
  );
}
