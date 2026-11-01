"use client";

import { useState } from "react";

export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copybox">
      <p>{text}</p>
      <button type="button" className="link-btn" onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
