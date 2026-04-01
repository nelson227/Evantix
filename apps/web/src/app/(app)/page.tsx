'use client';

import { AppShell } from '@/components/app-shell';
import { PublicationCard } from '@/components/publication-card';
import { api } from '@/lib/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, Filter, Plus, User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { mediaUrl } from '@/lib/api';

const TYPES = [
  { value: '', label: 'Tous' },
  { value: 'activity_report', label: 'Rapports' },
  { value: 'testimony', label: 'Témoignages' },
  { value: 'prayer_request', label: 'Prières' },
  { value: 'announcement', label: 'Annonces' },
  { value: 'event', label: 'Événements' },
  { value: 'encouragement', label: 'Encouragements' },
];

export default function FeedPage() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed', typeFilter, search],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: '15' };
      if (pageParam) params.cursor = pageParam;
      if (typeFilter) params.type = typeFilter;
      if (search) params.q = search;
      const { data } = await api.get('/publications', { params });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const publications = data?.pages.flatMap((p) => p.items ?? p.data ?? []) ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Create post box (Facebook-style) */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <Link
              href="/publications/new"
              className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2.5 text-gray-500 text-sm transition-colors"
            >
              Quoi de neuf, {user?.displayName?.split(' ')[0] ?? 'vous'} ?
            </Link>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
            }}
            className="relative flex-1"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher…"
              className="input pl-9 pr-3 py-2 text-sm w-full"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Publications */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : publications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune publication trouvée
          </div>
        ) : (
          <div className="space-y-4">
            {publications.map((pub: Record<string, unknown>) => (
              <PublicationCard key={pub.id as string} publication={pub as never} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="btn-secondary"
            >
              {isFetchingNextPage ? 'Chargement…' : 'Voir plus'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
