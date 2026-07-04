// StudioWorkspace, общий каркас рабочего места инструмента.
// Шапка, центр-превью, нижний док контролов, лента, опциональный правый инспектор.
// На мобиле/планшете (<lg) инспектор уезжает в нижнюю шторку, открывается FAB-кнопкой.
import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "./primitives";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function StudioWorkspace({
  header,
  preview,
  dock,
  reel,
  inspector,
  className,
}: {
  header: ReactNode;
  preview: ReactNode;
  dock?: ReactNode;
  reel?: ReactNode;
  /** Правый инспектор (вкладки Промпт / Настройки и т.п.). */
  inspector?: ReactNode;
  className?: string;
}) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  return (
    <div className={cn("min-h-dvh w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-7 max-w-[1500px] mx-auto pb-24 lg:pb-7", className)}>
      {header}
      <div className={cn("grid gap-4 lg:gap-5", inspector ? "lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]" : "")}>
        <div className="min-w-0 flex flex-col gap-4 lg:gap-5">
          <Panel className="p-3 sm:p-4 lg:p-5 flex flex-col gap-4">
            <div className="flex-1 min-h-[320px] sm:min-h-[440px] lg:min-h-[520px]">{preview}</div>
            {dock && <div className="border-t border-border pt-4">{dock}</div>}
          </Panel>
          {reel && <div>{reel}</div>}
        </div>
        {inspector && (
          <>
            {/* Desktop sticky inspector */}
            <aside className="hidden lg:block lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto">
              {inspector}
            </aside>

            {/* Mobile/tablet FAB → bottom sheet */}
            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              aria-label="Открыть настройки"
              className="lg:hidden fixed bottom-5 right-4 z-30 inline-flex items-center gap-2 h-12 min-w-12 px-4 rounded-full text-[13px] font-semibold btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ boxShadow: "var(--shadow-warm)" }}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
              Настройки
            </button>
            <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
              <SheetContent
                side="bottom"
                className="lg:hidden p-0 bg-background border-t border-border max-h-[88dvh] rounded-t-2xl overflow-hidden flex flex-col"
              >
                <SheetTitle className="sr-only">Настройки инструмента</SheetTitle>
                <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
                  <span className="block w-10 h-1 rounded-full bg-border" />
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-6">
                  {inspector}
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </div>
  );
}
