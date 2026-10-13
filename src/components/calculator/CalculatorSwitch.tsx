"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { Tabs } from "@/components/ui/Tabs";
import { QuickCalculator } from "./QuickCalculator";
import { ProCalculator } from "./ProCalculator";

export function CalculatorSwitch() {
  const { dict } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode = sp.get("mode") === "pro" ? "pro" : "quick";
  return (
    <>
      <Tabs
        label={dict.calculator.title}
        value={mode}
        onChange={(m) => {
          const p = new URLSearchParams(sp.toString());
          if (m === "pro") p.set("mode", "pro");
          else p.delete("mode");
          router.replace(`${pathname}?${p.toString()}`, { scroll: false });
        }}
        tabs={[
          { id: "quick", label: dict.calculator.quick },
          { id: "pro", label: dict.calculator.pro },
        ]}
        className="mb-4 max-w-md"
      />
      <p className="mb-10 text-sm text-ink-3">{mode === "pro" ? dict.calculator.proLead : dict.calculator.quickLead}</p>
      {mode === "pro" ? <ProCalculator /> : <QuickCalculator />}
    </>
  );
}
