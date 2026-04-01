'use client';

import { AppShell } from '@/components/app-shell';
import { PublicationCard } from '@/components/publication-card';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send } from 'lucide-react';

export default function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: publication, isLoading } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}`);
      return data;
    },
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}/comments`, {
        params: { limit: 50 },
      });
      return data;
    },
    enabled: !!id,
  });

  const addComment = useMutation({
    mutationFn: (content: string) =>
      api.post(`/publications/${id}/comments`, { content }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['publication', id] });
    },
  });

  const comments = commentsData?.data ?? [];

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!publication) {
    return (
      <AppShell>
        <div className="text-center py-12 text-gray-500">Publication introuvable</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PublicationCard publication={publication} />

        {/* Comments */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">
            Commentaires ({comments.length})
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim()) addComment.mutate(commentText.trim());
            }}
            className="flex gap-2"
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input flex-1"
              placeholder="Ajouter un commentaire…"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || addComment.isPending}
              className="btn-primary px-3"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="space-y-3">
            {comments.map((c: { id: string; content: string; author: { displayName: string }; createdAt: string }) => (
              <div key={c.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                  {c.author.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.author.displayName}</span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
