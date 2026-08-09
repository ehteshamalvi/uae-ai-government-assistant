import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SandboxBanner } from '@/components/layout/sandbox-banner';
import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';

export function LoginPage() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslation(locale);

  return (
    <div className="min-h-dvh bg-background">
      <SandboxBanner />
      <div className="mx-auto flex min-h-[calc(100dvh-40px)] max-w-md flex-col justify-center px-6 py-10">
        <h1 className="mb-2 font-headline text-3xl font-bold text-primary">{t('login.title')}</h1>
        <p className="mb-8 text-on-surface-variant">{t('login.subtitle')}</p>
        <Card className="space-y-4">
          <Input label={t('login.email')} defaultValue="khalid.demo@govflow.ai" type="email" />
          <Input label={t('login.password')} defaultValue="DemoPass123!" type="password" />
          <Link to="/">
            <Button className="w-full">{t('actions.login')}</Button>
          </Link>
          <p className="text-center text-xs text-on-surface-variant">
            Placeholder screen — JWT auth will be wired in a later phase.
          </p>
        </Card>
      </div>
    </div>
  );
}
