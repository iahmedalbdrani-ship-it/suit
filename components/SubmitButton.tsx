"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending, className = "btn", name, value, confirm, "aria-label": ariaLabel }: {
  children: React.ReactNode; pending?: string; className?: string; name?: string; value?: string; confirm?: string; "aria-label"?: string;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      name={name}
      value={value}
      aria-label={ariaLabel}
      disabled={isPending}
      aria-busy={isPending}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {isPending && pending ? pending : children}
    </button>
  );
}
