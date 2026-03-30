'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Plus, Filter, Search, Trash2, Edit, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  published: 'Publié',
  draft: 'Brouillon',
  hidden: 'Masqué',
};

const TYPE_LABELS: Record<string, string> = {
  past_outreach: 'Activité passée',
  future_event: 'Événement futur',
  testimony: 'Témoignage',
  prayer_request: 'Demande de prière',
  announcement: 'Annonce',
};

export default function PublicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['my-publications', typeFilter, statusFilter, search, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (cursor) params.set('cursor', cursor);
      params.set('limit', '20');
      params.set('authorId', user?.id || '');
      const res = await api.get(`/publications/feed?${params}`);
      return res.data;
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/publications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-publications'] }),
  });

  const publications = data?.data || [];
  const nextCursor = data?.nextCursor;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes Publications</h1>
        <Link href="/publications/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCursor(undefined); }}
              className="input pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCursor(undefined); }}
            className="input w-auto"
          >
            <option value="">Tous les types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCursor(undefined); }}
            className="input w-auto"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Publications List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : publications.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">Aucune publication trouvée</p>
          <Link href="/publications/new" className="btn-primary">
            Créer ma première publication
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {publications.map((pub: any) => (
            <div key={pub.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      pub.status === 'published' ? 'bg-green-100 text-green-700' :
                      pub.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {STATUS_LABELS[pub.status] || pub.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {TYPE_LABELS[pub.type] || pub.type}
                    </span>
                  </div>
                  <h3 className="font-semibold truncate">{pub.title || 'Sans titre'}</h3>
                  {pub.body && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{pub.body}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{format(new Date(pub.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                    {pub._count && (
                      <>
                        <span>{pub._count.likes || 0} likes</span>
                        <span>{pub._count.comments || 0} commentaires</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/publications/${pub.id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    title="Voir"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer cette publication ?')) {
                        deleteMutation.mutate(pub.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={() => setCursor(nextCursor)}
              className="w-full py-3 text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Voir plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
