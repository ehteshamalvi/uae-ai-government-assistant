import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';

export function SandboxBanner() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslation(locale);

  return (
    <div className="border-b border-secondary-fixed/40 bg-secondary-fixed/20 px-4 py-2 text-center text-xs text-on-secondary-fixed-variant">
      {t('sandboxBanner')}
    </div>
  );
}
