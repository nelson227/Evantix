'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n: { readAt: string | null }) => !n.readAt);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {hasUnread && (
            <button onClick={() => markAllRead.mutate()} className="btn-secondary text-sm">
              <CheckCheck className="h-4 w-4 mr-1.5" /> Tout marquer lu
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            Aucune notification
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string }) => (
              <div
                key={n.id}
                className={`card !p-4 flex items-start gap-3 ${!n.readAt ? 'border-l-4 border-l-primary-500' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                {!n.readAt && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600"
                    title="Marquer comme lu"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
