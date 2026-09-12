import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger-soft";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold font-ui cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-[0_10px_30px_rgba(255,61,113,.34)]",
  secondary: "bg-white/10 border border-white/20 text-white hover:bg-white/15",
  ghost: "bg-transparent border border-white/16 text-text-3 hover:border-white/30",
  "danger-soft": "bg-accent-soft border border-accent-border text-[#FF7FA2] hover:bg-[rgba(255,61,113,.22)]",
};

const sizes: Record<Size, string> = {
  md: "text-sm px-5 py-3",
  lg: "text-base px-7 py-4",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});
