import { NavLink } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';

const desktopLinks = [
  { to: '/', icon: 'dashboard', labelKey: 'nav.dashboard' },
  { to: '/demo', icon: 'present_to_all', labelKey: 'nav.demo' },
  { to: '/search', icon: 'search', labelKey: 'nav.search' },
  { to: '/copilot', icon: 'smart_toy', labelKey: 'nav.aiChat' },
  { to: '/history', icon: 'history', labelKey: 'nav.history' },
  { to: '/settings', icon: 'settings', labelKey: 'nav.settings' },
];

export function AppSidebar() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslation(locale);

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-80 flex-col border-e border-outline-variant bg-surface p-4 shadow-lg md:flex">
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-bold text-primary">{t('appName')}</h1>
        <p className="mt-1 text-xs text-on-surface-variant">{t('tagline')}</p>
      </div>
      <div className="mb-8 flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-variant font-bold text-primary">
          KA
        </div>
        <div>
          <p className="font-label text-sm font-bold text-primary">Khalid Al-Mansoori</p>
          <p className="font-label text-xs text-on-surface-variant">Sandbox Demo User</p>
          <p className="mt-1 font-label text-xs text-secondary-fixed-dim">GovFlow AI Copilot Active</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {desktopLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl p-3 font-label text-sm transition ${
                isActive
                  ? 'bg-primary-container font-bold text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            {t(link.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
