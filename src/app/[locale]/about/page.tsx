import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { TextBlocks } from "@/components/layout/TextPage";
import { Alert } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

const copy = {
  ru: [
    { h: "О платформе", p: "Это цифровая платформа компании по производству, продаже и монтажу фасадного декора: каталог, 3D-конструктор, калькулятор и сметы в одной модели проекта." },
    { h: "Производство", p: "Раздел предназначен для описания производственных мощностей, материалов, контроля качества и сертификатов компании. Эти данные должны быть предоставлены компанией — мы не публикуем непроверенные сведения." },
    { h: "Как мы работаем", p: "Заявка → обмер → проект и смета → производство → доставка → монтаж. Каждый этап отражается в CRM компании после её подключения." },
  ],
  kk: [
    { h: "Платформа туралы", p: "Бұл қасбет декорын өндіру, сату және монтаждау компаниясының цифрлық платформасы: каталог, 3D-конструктор, калькулятор және сметалар бір жоба моделінде." },
    { h: "Өндіріс", p: "Бөлім компанияның өндірістік қуаттарын, материалдарын, сапа бақылауын және сертификаттарын сипаттауға арналған. Бұл деректерді компания беруі тиіс — біз тексерілмеген мәліметтерді жарияламаймыз." },
    { h: "Біз қалай жұмыс істейміз", p: "Өтінім → өлшеу → жоба және смета → өндіріс → жеткізу → монтаж. Әр кезең CRM қосылғаннан кейін компанияның CRM жүйесінде көрсетіледі." },
  ],
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/about/", dict.pages.aboutTitle);
}

export default async function AboutPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.about }]} title={dict.pages.aboutTitle} />
      <section className="container-x grid gap-12 lg:grid-cols-[2fr_1fr]">
        <TextBlocks blocks={copy[locale]} />
        <Alert tone="warn">{dict.common.demoNotice}</Alert>
      </section>
    </main>
  );
}
