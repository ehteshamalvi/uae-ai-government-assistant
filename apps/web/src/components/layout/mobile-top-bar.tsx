import { useLocaleStore } from '@/stores/locale-store';
import { useTranslation } from '@/i18n';

export function MobileTopBar({ title }: { title?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);
  const { t } = useTranslation(locale);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-surface px-[var(--spacing-margin-mobile)] md:hidden">
      <button type="button" className="text-primary" aria-label="Menu">
        <span className="material-symbols-outlined">menu</span>
      </button>
      <h1 className="font-headline text-xl font-bold text-primary">{title ?? t('appName')}</h1>
      <button type="button" className="text-primary" onClick={toggleLocale} aria-label={t('common.language')}>
        <span className="material-symbols-outlined">language</span>
      </button>
    </header>
  );
}
