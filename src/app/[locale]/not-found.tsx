import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function LocaleNotFound() {
  return (
    <main className="container-x flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <p className="dim">404</p>
      <h1 className="display-2">Страница не найдена · Бет табылмады</h1>
      <div className="flex gap-2">
        <Link href="/ru/catalog/" className={buttonClass("primary")}>
          Каталог
        </Link>
        <Link href="/ru/" className={buttonClass("secondary")}>
          Главная
        </Link>
      </div>
    </main>
  );
}
