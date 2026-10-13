import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeadForm } from "@/components/forms/LeadForm";
import { TextBlocks } from "@/components/layout/TextPage";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

const copy = {
  ru: [
    { h: "Когда нужен индивидуальный проект", p: "Если нужного профиля нет в каталоге, требуется повторить исторический декор или фасад сложной формы — мы разрабатываем изделия по эскизу, фотографии или чертежу." },
    { h: "Что приложить", p: "Фото фасада, обмерный чертёж или эскиз с основными размерами. Чем точнее размеры, тем быстрее будет подготовлено предложение." },
    { h: "Как формируется цена", p: "Стоимость индивидуальных изделий рассчитывает менеджер после оценки сложности формы. В калькуляторе такие позиции отмечаются как «по запросу» и не включаются в итог." },
  ],
  kk: [
    { h: "Жеке жоба қашан қажет", p: "Егер қажетті профиль каталогта болмаса, тарихи декорды қайталау немесе күрделі пішінді қасбет қажет болса — бұйымдарды эскиз, фото немесе сызба бойынша әзірлейміз." },
    { h: "Нені тіркеу керек", p: "Қасбет фотосы, өлшеу сызбасы немесе негізгі өлшемдері бар эскиз. Өлшемдер неғұрлым дәл болса, ұсыныс соғұрлым тез дайындалады." },
    { h: "Баға қалай қалыптасады", p: "Жеке бұйымдардың құнын менеджер пішіннің күрделілігін бағалағаннан кейін есептейді. Калькуляторда мұндай позициялар «сұрау бойынша» деп белгіленеді және қорытындыға кірмейді." },
  ],
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/custom-design/", dict.pages.customTitle);
}

export default async function CustomPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.customDesign }]} title={dict.pages.customTitle} />
      <section className="container-x grid gap-12 lg:grid-cols-2">
        <TextBlocks blocks={copy[locale]} />
        <div className="border border-line bg-white p-6">
          <h2 className="display-3 mb-4">{dict.lead.title}</h2>
          <LeadForm initialComment={dict.pages.customTitle} />
        </div>
      </section>
    </main>
  );
}
