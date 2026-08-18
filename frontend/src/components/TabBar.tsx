import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Кабинет', icon: 'home' },
  { to: '/plan', label: 'План', icon: 'plan' },
  { to: '/chart', label: 'Карта', icon: 'chart' },
  { to: '/history', label: 'История', icon: 'history' },
  { to: '/family', label: 'Семья', icon: 'family' },
];

function Icon({ name }: { name: string }) {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === 'plan') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (name === 'chart') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4h8v6.5c0 2.5-1.7 4.6-4 5.3-2.3-.7-4-2.8-4-5.3V4zm2 14h4v3h-4z" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5a7 7 0 1 1-6.3 4H8l-3 4-3-4h3.1A9 9 0 1 0 12 3v2zm-.8 3h1.6v4.2l3 1.8-.8 1.3-3.8-2.3V8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM4.5 19c.4-2.6 2.6-4.5 5.5-4.5h.3c.9 1.3 2.4 2 4.2 2s3.3-.7 4.2-2h.3c2.9 0 5.1 1.9 5.5 4.5v1H4.5v-1z" />
    </svg>
  );
}

export function TabBar() {
  return (
    <nav className="tabbar">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => (isActive ? 'tabbar-link active' : 'tabbar-link')}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
