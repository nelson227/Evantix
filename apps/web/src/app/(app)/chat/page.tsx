'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ChatPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [memberId, setMemberId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data;
    },
  });

  const createConv = useMutation({
    mutationFn: () => api.post('/chat/conversations', { participantId: memberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setShowNew(false);
      setMemberId('');
    },
  });

  const conversations = data?.data ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle conversation
          </button>
        </div>

        {showNew && (
          <div className="card space-y-3">
            <label className="block text-sm font-medium text-gray-700">ID du membre</label>
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="input"
              placeholder="Entrez l'identifiant du membre"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => createConv.mutate()}
                disabled={!memberId || createConv.isPending}
                className="btn-primary"
              >
                Créer
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            Aucune conversation
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c: {
              id: string;
              participants: { user: { displayName: string } }[];
              lastMessage?: { content: string; createdAt: string };
              updatedAt: string;
            }) => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="card flex items-center gap-3 hover:bg-gray-50 transition-colors !p-4"
              >
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {c.participants?.map((p) => p.user.displayName).join(', ')}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  {c.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{c.lastMessage.content}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
