import { type InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, id, className = "", ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-[7px] min-w-0 w-full" htmlFor={inputId}>
      {label && <span className="text-[13px] font-semibold text-text-4">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        className={`w-full min-w-0 rounded-[10px] border px-4 py-[15px] text-[15px] text-white outline-none font-ui placeholder:text-text-7 bg-white/5 border-white/14 focus:border-accent transition-colors ${
          error ? "border-accent" : ""
        } ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-text-7">{hint}</span>}
      {error && <span className="text-xs text-accent">{error}</span>}
    </label>
  );
});
