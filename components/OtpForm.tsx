"use client";

import { useEffect, useRef, useState } from "react";
import { SubmitButton } from "./SubmitButton";

type Props = {
  locale: "ar" | "en";
  next: string;
  verifyAction: (fd: FormData) => void | Promise<void>;
  resendAction: (fd: FormData) => void | Promise<void>;
  changeAction: (fd: FormData) => void | Promise<void>;
  resendAt: number; // epoch ms, from the server
  t: { codeLabel: string; verify: string; verifying: string; resend: string; resendIn: string; change: string };
};

const toLatin = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

export function OtpForm({ locale, next, verifyAction, resendAction, changeAction, resendAt, t }: Props) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const onChange = (raw: string) => {
    const digits = toLatin(raw).replace(/\D/g, "").slice(0, 6); // handles pasting "123 456", "١٢٣٤٥٦", etc.
    setCode(digits);
    if (digits.length === 6) setTimeout(() => formRef.current?.requestSubmit(), 50);
  };

  return (
    <div className="stack">
      <form ref={formRef} action={verifyAction} className="stack">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next} />
        <label className="field"><span>{t.codeLabel}</span>
          <input
            className="input otp-input" name="code" value={code} onChange={(e) => onChange(e.target.value)}
            inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={20} dir="ltr" required autoFocus
            aria-describedby="otp-help" placeholder="••••••"
          />
        </label>
        <SubmitButton className="btn btn-lg btn-block" pending={t.verifying}>{t.verify}</SubmitButton>
      </form>
      <div className="otp-actions">
        <form action={resendAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <button className="btn btn-outline" type="submit" disabled={left > 0}>{t.resend}</button>
        </form>
        <span id="otp-help" className="muted small" aria-live="polite" role="timer">
          {left > 0 ? t.resendIn.replace("{n}", String(left)) : ""}
        </span>
        <form action={changeAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <button className="linklike" type="submit">{t.change}</button>
        </form>
      </div>
    </div>
  );
}
