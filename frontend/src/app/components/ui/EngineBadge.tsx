"use client";

type Props = {
  version?: string;
  mode?: string;
  blurb?: string;
};

export default function EngineBadge({
  version = "Rules v0",
  mode = "Deterministic",
  blurb = "Explains with IFRS citations",
}: Props) {
  return (
    <span
      title={`${version} • ${mode} • ${blurb}`}
      className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 shadow-sm"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      <span className="font-medium">Engine:</span>
      <span className="text-neutral-900">{version}</span>
      <span className="opacity-70">• {mode}</span>
      <span className="opacity-70 hidden sm:inline">• {blurb}</span>
    </span>
  );
}
