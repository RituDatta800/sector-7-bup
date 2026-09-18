'use client';

import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BackendStatus } from './backend-status';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <a href="#main" className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-lg"
          >
            <Zap className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold tracking-tight">
              GridWise
            </span>
            <span className="text-subtle-foreground block truncate text-[10px]">
              Smart Campus Energy Optimization
            </span>
          </span>
        </a>

        <Badge variant="outline" className="hidden shrink-0 md:inline-flex">
          BUP CSE Fest 2026
        </Badge>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <BackendStatus />
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
