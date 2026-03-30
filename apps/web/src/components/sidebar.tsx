'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  PenSquare,
  Target,
  BarChart3,
  MessageCircle,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Fil d\'actualité', icon: Home },
  { href: '/publications/new', label: 'Nouvelle publication', icon: PenSquare },
  { href: '/goals', label: 'Objectifs', icon: Target },
  { href: '/dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { href: '/chat', label: 'Messages', icon: MessageCircle },
];

const adminItems = [
  { href: '/admin', label: 'Administration', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev);
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const items = user?.role === 'admin' || user?.role === 'moderator'
    ? [...navItems, ...adminItems]
    : navItems;

  const nav = (
    <nav className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-gray-200 bg-white">
        {nav}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="text-lg font-bold text-primary-600">Evantix</span>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
