"use client";

import { useEffect, useRef, useState } from "react";

const idFormat = new Intl.NumberFormat("id-ID");

function format(n: number) {
  return n > 0 ? idFormat.format(Math.round(n)) : "";
}

/**
 * Indonesian-formatted money input (e.g. 1.000.000).
 * - Shows thousand separators while typing.
 * - The default 0 is shown as an empty field, so the user types straight away
 *   (no need to delete the 0 first); focusing also selects any existing value.
 * - Reports the parsed numeric value through `onValueChange`.
 */
export function CurrencyInput({
  value,
  onValueChange,
  placeholder = "0",
  className,
  style,
  id
}: {
  value: number | null | undefined;
  onValueChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) {
  const [text, setText] = useState(format(Number(value ?? 0)));
  const focused = useRef(false);

  // Keep the display in sync when the value changes externally (e.g. form reset),
  // but don't fight the user while they are typing.
  useEffect(() => {
    if (!focused.current) setText(format(Number(value ?? 0)));
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      className={className}
      style={style}
      value={text}
      onFocus={(e) => { focused.current = true; e.target.select(); }}
      onBlur={() => { focused.current = false; setText(format(Number(value ?? 0))); }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        const n = digits ? parseInt(digits, 10) : 0;
        setText(digits ? idFormat.format(n) : "");
        onValueChange(n);
      }}
    />
  );
}
