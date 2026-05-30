import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/settings/general',       label: 'General' },
  { to: '/settings/transactions',  label: 'Transactions' },
  { to: '/settings/item',          label: 'Item' },
  { to: '/settings/party',         label: 'Party' },
  { to: '/settings/taxes',         label: 'Taxes' },
  { to: '/settings/payment-types', label: 'Payment Types' },
  { to: '/settings/loyalty',       label: 'Loyalty' },
  { to: '/settings/unit',          label: 'Unit' },
  { to: '/settings/print',         label: 'Print' },
  { to: '/settings/reset',         label: 'Reset Data' },
];

export default function Settings() {
  return (
    <div className="settings-layout">
      <aside className="settings-nav">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} className={({isActive})=>`settings-nav-link${isActive?' active':''}`}>
            {t.label}
          </NavLink>
        ))}
      </aside>
      <section className="settings-content">
        <Outlet />
      </section>
    </div>
  );
}
