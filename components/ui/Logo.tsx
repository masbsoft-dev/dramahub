export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dot = size === "lg" ? "w-2.5 h-2.5" : size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const text = size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-base";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`${dot} rounded-full bg-accent`}
        style={{ boxShadow: size === "lg" ? "0 0 18px var(--color-accent)" : undefined }}
      />
      <span className={`font-display font-extrabold tracking-[0.04em] ${text}`}>DRAMAHUB</span>
    </div>
  );
}
