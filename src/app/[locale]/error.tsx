"use client";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { dict } = useI18n();
  return (
    <main className="container-x flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <p className="dim">ERROR</p>
      <h1 className="display-2">{dict.pages.errorTitle}</h1>
      <p className="text-ink-3">{dict.pages.errorText}</p>
      <Button onClick={reset}>{dict.common.tryAgain}</Button>
    </main>
  );
}
