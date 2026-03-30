'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { mediaUrl } from '@/lib/api';
import {
  Bell,
  Menu,
  LogOut,
  User,
  Search,
} from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarSrc = (user as any)?.profile?.avatarUrl
    ? mediaUrl((user as any).profile.avatarUrl)
    : null;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 -m-2 text-gray-500 hover:text-gray-700"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/" className="text-2xl font-extrabold text-primary-600 tracking-tight">
            Evantix
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100"
            >
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.displayName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Link
                  href="/profile"
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Mon profil
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
