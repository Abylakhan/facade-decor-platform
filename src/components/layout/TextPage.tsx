import type { ReactNode } from "react";

/** Editorial two-column layout for text pages. */
export function TextBlocks({ blocks }: { blocks: { h?: string; p: string }[] }) {
  return (
    <div className="max-w-2xl space-y-6 text-[17px] leading-relaxed text-ink-2">
      {blocks.map((b, i) => (
        <div key={i}>
          {b.h && <h2 className="display-3 mb-3">{b.h}</h2>}
          <p>{b.p}</p>
        </div>
      ))}
    </div>
  );
}

export function Aside({ children }: { children: ReactNode }) {
  return <aside className="border-l border-line pl-6 text-sm text-ink-3">{children}</aside>;
}
