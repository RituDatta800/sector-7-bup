import { Separator } from '@/components/ui/separator';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background/85 sticky bottom-0 z-40 border-t backdrop-blur-md">
      <div className="text-muted-foreground mx-auto flex h-11 max-w-[1600px] items-center gap-3 px-4 text-[11px] sm:px-6">
        <span className="font-semibold tracking-tight">AlgoLink</span>
        <span className="text-subtle-foreground" aria-hidden>
          /
        </span>
        <span className="text-subtle-foreground">Algoverse</span>

        <Separator orientation="vertical" className="hidden h-4 sm:block" />

        <span className="text-subtle-foreground hidden truncate sm:inline">
          GridWise LLM — operator console
        </span>

        <span className="text-subtle-foreground ml-auto shrink-0 tabular">
          © {year} AlgoLink. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
