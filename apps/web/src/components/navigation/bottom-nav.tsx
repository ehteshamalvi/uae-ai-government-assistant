import { NavLink } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';

const links = [
  { to: '/', icon: 'home', labelKey: 'nav.home' },
  { to: '/search', icon: 'search', labelKey: 'nav.search' },
  { to: '/copilot', icon: 'smart_toy', labelKey: 'nav.aiChat' },
  { to: '/history', icon: 'history', labelKey: 'nav.history' },
  { to: '/settings', icon: 'settings', labelKey: 'nav.settings' },
];

export function BottomNav() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslation(locale);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around rounded-t-full border-t border-outline-variant bg-surface-container px-4 pb-4 pt-2 shadow-sm md:hidden">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-1 transition ${
              isActive
                ? 'rounded-full bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined">{link.icon}</span>
          <span className="font-label text-[11px]">{t(link.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
