import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogicLabel } from '@/components/ui/logic-label';
import { LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';
import { useDemoStatus } from '@/hooks/use-demo';
import { useHealthCheck } from '@/hooks/use-health';

const rows = [
  { icon: 'notifications', label: 'Notifications', to: null },
  { icon: 'shield_lock', label: 'Security & Access', to: null },
  { icon: 'description', label: 'Privacy Policy', to: null },
  { icon: 'rule', label: 'Terms of Use', to: null },
  { icon: 'support_agent', label: 'Support', to: null },
];

export function SettingsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { t } = useTranslation(locale);
  const demo = useDemoStatus();
  const health = useHealthCheck();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="relative overflow-hidden bg-primary-container text-on-primary-container">
        <span className="material-symbols-outlined absolute -bottom-2 -end-2 text-4xl opacity-20">
          shield_person
        </span>
        <h2 className="font-headline text-2xl text-on-primary">Khalid Al-Mansoori</h2>
        <p className="mt-1 text-sm opacity-90">khalid.demo@govflow.ai · Sandbox Demo User</p>
      </Card>

      <Card>
        <h3 className="mb-3 font-label text-sm uppercase tracking-wider text-outline">Language</h3>
        <div className="flex gap-2" role="group" aria-label="Language">
          <Button
            variant={locale === 'en' ? 'primary' : 'secondary'}
            onClick={() => setLocale('en')}
            aria-pressed={locale === 'en'}
          >
            English
          </Button>
          <Button
            variant={locale === 'ar' ? 'primary' : 'secondary'}
            onClick={() => setLocale('ar')}
            aria-pressed={locale === 'ar'}
          >
            العربية
          </Button>
        </div>
        <p className="mt-3 text-sm text-on-surface-variant">
          {t('common.language')}: {locale.toUpperCase()} · Direction:{' '}
          {locale === 'ar' ? 'RTL' : 'LTR'}
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 font-label text-sm uppercase tracking-wider text-outline">
          Platform status
        </h3>
        {demo.isLoading || health.isLoading ? <LoadingState label="Loading status…" /> : null}
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <LogicLabel kind="sandbox" />
            <StatusBadge
              label={demo.data?.demoMode ? 'Demo Mode ON' : 'Demo Mode OFF'}
              tone={demo.data?.demoMode ? 'ai' : 'neutral'}
            />
          </div>
          <p className="text-on-surface-variant">
            AI Provider:{' '}
            <strong className="text-primary">
              {(demo.data?.aiProvider ?? health.data?.ai?.provider ?? 'mock').toUpperCase()}
            </strong>{' '}
            (read-only — not configurable from this UI)
          </p>
          {health.data ? (
            <p className="text-on-surface-variant">
              API {health.data.status} · DB {health.data.checks?.database} · Redis{' '}
              {health.data.checks?.redis} · Env {health.data.environment ?? '—'}
            </p>
          ) : null}
          <p className="text-xs text-outline">
            Sensitive backend configuration cannot be changed by ordinary users.
          </p>
        </div>
        <Link to="/demo" className="mt-4 inline-block">
          <Button variant="secondary">Open Council Demo</Button>
        </Link>
      </Card>

      <div className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-start hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="flex items-center gap-4 text-primary">
              <span className="material-symbols-outlined text-outline" aria-hidden>
                {row.icon}
              </span>
              {row.label}
            </span>
            <span className="material-symbols-outlined text-outline-variant" aria-hidden>
              chevron_right
            </span>
          </button>
        ))}
      </div>

      <Link to="/login">
        <Button variant="danger" className="w-full">
          <span className="material-symbols-outlined">logout</span>
          {t('actions.logout')}
        </Button>
      </Link>
    </div>
  );
}
