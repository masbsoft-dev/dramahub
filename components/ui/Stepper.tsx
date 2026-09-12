export function Stepper({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-[22px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-sm ${i < step ? "bg-accent" : "bg-white/14"}`}
        />
      ))}
    </div>
  );
}
