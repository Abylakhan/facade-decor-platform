"use client";
import { useState } from "react";
import type { Estimate, Project } from "@/domain/types";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { IconName } from "@/components/ui/icons";
import { LeadForm } from "./LeadForm";

export function LeadModalButton({
  label,
  title,
  project,
  estimate,
  comment,
  variant = "primary",
  icon,
  size = "md",
}: {
  label: string;
  title?: string;
  project?: Project;
  estimate?: Estimate;
  comment?: string;
  variant?: "primary" | "secondary" | "bronze" | "ghost";
  icon?: IconName;
  size?: "sm" | "md" | "lg";
}) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} icon={icon} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title ?? dict.lead.title} closeLabel={dict.nav.close}>
        <LeadForm project={project} estimate={estimate} initialComment={comment} />
      </Modal>
    </>
  );
}
