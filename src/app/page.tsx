import { asset } from "@/lib/site";
import { RootRedirect } from "@/components/layout/RootRedirect";

/** "/" → remembered or browser language (ru by default). Meta refresh covers no-JS visitors. */
export default function Root() {
  return (
    <>
      <meta httpEquiv="refresh" content={`2; url=${asset("/ru/")}`} />
      <RootRedirect />
      <main className="flex min-h-screen items-center justify-center bg-paper text-ink-3">
        <a href={asset("/ru/")} className="font-display text-2xl">
          Atelier Façade →
        </a>
      </main>
    </>
  );
}
