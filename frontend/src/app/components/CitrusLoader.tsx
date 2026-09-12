"use client";
import { useEffect, useState } from "react";
export function CitrusDance({
  text = "Balancing the citrus…",
}: {
  text?: string;
}) {
  return (
    <div className="citrus-loading" role="status">
      <div className="citrus-trio" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span>{text}</span>
    </div>
  );
}
export default function CitrusLoader() {
  const [loading, setLoading] = useState(true);
  useEffect(() => setLoading(false), []);
  return loading ? (
    <div className="citrus-boot">
      <CitrusDance text="Getting Yuzu ready…" />
    </div>
  ) : null;
}
