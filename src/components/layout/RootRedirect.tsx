"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    let loc = "ru";
    try {
      const saved = localStorage.getItem("fd.locale");
      if (saved === "kk" || saved === "ru") loc = saved;
      else if (navigator.language.toLowerCase().startsWith("kk")) loc = "kk";
    } catch {
      /* ignore */
    }
    router.replace(`/${loc}/`);
  }, [router]);
  return null;
}
