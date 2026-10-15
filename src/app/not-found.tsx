import Link from "next/link";

export default function NotFound() {
  return (
    <main className="paper-grid flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center text-ink">
      <p className="dim">ERROR 404</p>
      <h1 className="display-2">Страница не найдена · Бет табылмады</h1>
      <div className="flex gap-4 text-sm">
        <Link href="/ru/" className="link">Русский</Link>
        <Link href="/kk/" className="link">Қазақша</Link>
      </div>
    </main>
  );
}
