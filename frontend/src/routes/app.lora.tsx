import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { StudioPlaceholder } from "@/components/studio-placeholder";

export const Route = createFileRoute("/app/lora")({
  head: () => ({ meta: [{ title: "Обучение LoRA" }] }),
  component: () => (
    <StudioPlaceholder
      icon={GraduationCap}
      title="Обучение LoRA"
      description="Подними кастомную модель под свой стиль или персонажа на нескольких десятках референсов."
    />
  ),
});
