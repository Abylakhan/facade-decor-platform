import Link from "next/link";

export default function NotFound() {
  return (
    <main className="blueprint-grid flex min-h-screen flex-col items-center justify-center gap-6 bg-blueprint px-6 text-center text-white">
      <p className="dim !text-white/50">ERROR 404</p>
      <h1 className="display-2 !text-white">Страница не найдена · Бет табылмады</h1>
      <div className="flex gap-4 text-sm">
        <Link href="/ru/" className="link">Русский</Link>
        <Link href="/kk/" className="link">Қазақша</Link>
      </div>
    </main>
  );
}
