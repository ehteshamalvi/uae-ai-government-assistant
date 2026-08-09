import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { SandboxBanner } from '@/components/layout/sandbox-banner';
import { useLocaleStore } from '@/stores/locale-store';
import { useHealthCheck } from '@/hooks/use-health';

export function AppShell({ focused = false }: { focused?: boolean }) {
  const locale = useLocaleStore((s) => s.locale);
  const { data: health } = useHealthCheck();

  return (
    <div className="min-h-dvh bg-background text-on-background" lang={locale}>
      <SandboxBanner />
      {!focused ? <AppSidebar /> : null}
      {!focused ? <MobileTopBar /> : null}
      <main
        className={
          focused
            ? 'mx-auto min-h-dvh w-full max-w-[1440px] px-6 pb-10 pt-4 md:px-12'
            : 'px-[var(--spacing-margin-mobile)] pb-28 pt-20 md:ms-80 md:px-[var(--spacing-margin-desktop)] md:pb-8 md:pt-8'
        }
      >
        {!focused && health ? (
          <div className="mb-4 flex items-center gap-2 text-xs text-on-surface-variant">
            <span
              className={`h-2 w-2 rounded-full ${
                health.status === 'ok' ? 'bg-success' : 'bg-warning'
              }`}
            />
            API {health.service}: {health.status}
            {health.checks
              ? ` · db ${health.checks.database} · redis ${health.checks.redis}`
              : null}
          </div>
        ) : null}
        <Outlet />
      </main>
      {!focused ? <BottomNav /> : null}
    </div>
  );
}
