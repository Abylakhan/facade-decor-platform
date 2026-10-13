import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { TextBlocks } from "@/components/layout/TextPage";
import { Alert } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

const copy = {
  ru: [
    { h: "Черновик", p: "Это шаблон политики для демонстрационной версии. Перед запуском текст должен быть подготовлен юристом компании с учётом законодательства Республики Казахстан о персональных данных." },
    { h: "Какие данные обрабатываются", p: "Имя, телефон, электронная почта, регион объекта, комментарий и приложенные файлы — только для ответа на заявку. В демо-режиме заявки не передаются на сервер." },
    { h: "Где хранятся проекты", p: "Проекты, избранное и сравнение хранятся в локальном хранилище вашего браузера и не передаются третьим лицам. Их можно удалить, очистив данные сайта." },
    { h: "Cookies и аналитика", p: "Демо-версия не использует рекламные cookies и сторонние системы аналитики." },
  ],
  kk: [
    { h: "Жоба", p: "Бұл демонстрациялық нұсқаға арналған саясат үлгісі. Іске қосу алдында мәтінді компания заңгері Қазақстан Республикасының дербес деректер туралы заңнамасын ескере отырып дайындауы тиіс." },
    { h: "Қандай деректер өңделеді", p: "Аты, телефон, электрондық пошта, нысан аймағы, түсініктеме және тіркелген файлдар — тек өтінімге жауап беру үшін. Демо-режимде өтінімдер серверге берілмейді." },
    { h: "Жобалар қайда сақталады", p: "Жобалар, таңдаулылар және салыстыру браузеріңіздің жергілікті жадында сақталады және үшінші тұлғаларға берілмейді. Оларды сайт деректерін тазалау арқылы жоюға болады." },
    { h: "Cookies және аналитика", p: "Демо-нұсқа жарнамалық cookies пен үшінші тарап аналитика жүйелерін пайдаланбайды." },
  ],
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/privacy/", dict.pages.privacyTitle);
}

export default async function PrivacyPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.privacy }]} title={dict.pages.privacyTitle} />
      <section className="container-x space-y-8">
        <Alert tone="warn">{copy[locale][0]!.p}</Alert>
        <TextBlocks blocks={copy[locale].slice(1)} />
      </section>
    </main>
  );
}
