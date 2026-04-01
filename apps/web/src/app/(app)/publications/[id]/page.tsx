'use client';

import { AppShell } from '@/components/app-shell';
import { PublicationCard } from '@/components/publication-card';
import { api, mediaUrl, isVideo } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, ThumbsUp, User, Play } from 'lucide-react';

export default function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
    mutationFn: (body: string) =>
      api.post(`/publications/${id}/comments`, { body }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['publication', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const comments = Array.isArray(commentsData) ? commentsData : commentsData?.items ?? commentsData?.data ?? [];

  // Media for detail view
  const media = publication?.media ?? [];

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
      <div className="mx-auto max-w-2xl space-y-4">
        <PublicationCard publication={publication} />

        {/* Full-size media viewer */}
        {media.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">
                Médias ({media.length})
              </h3>
            </div>
            <div className="space-y-1">
              {media.map((m: { id: string; url: string }) =>
                isVideo(m.url) ? (
                  <video
                    key={m.id}
                    src={mediaUrl(m.url)}
                    controls
                    className="w-full max-h-[500px] bg-black"
                    preload="metadata"
                  />
                ) : (
                  <img
                    key={m.id}
                    src={mediaUrl(m.url)}
                    alt=""
                    className="w-full object-contain max-h-[600px]"
                    loading="lazy"
                  />
                ),
              )}
            </div>
          </div>
        )}

        {/* Comments section (Facebook-style) */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Commentaires ({comments.length})
            </h2>
          </div>

          {/* Comment input */}
          <div className="px-4 py-3 border-b border-gray-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (commentText.trim()) addComment.mutate(commentText.trim());
              }}
              className="flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex-1 relative">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Écrire un commentaire…"
                />
              </div>
              <button
                type="submit"
                disabled={!commentText.trim() || addComment.isPending}
                className="text-primary-600 hover:text-primary-700 disabled:text-gray-300 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* Comments list */}
          <div className="px-4 py-3 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucun commentaire. Soyez le premier à commenter !
              </p>
            ) : (
              comments.map((c: { id: string; body?: string; content?: string; author: { id: string; displayName: string; avatarUrl?: string }; createdAt: string }) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {c.author.avatarUrl ? (
                      <img
                        src={mediaUrl(c.author.avatarUrl)}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-600">
                        {c.author.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
                      <span className="text-[13px] font-semibold text-gray-900">
                        {c.author.displayName}
                      </span>
                      <p className="text-sm text-gray-700 mt-0.5">{c.body ?? c.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-2 text-xs text-gray-500">
                      <span>
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                      <button className="font-semibold hover:underline">J&apos;aime</button>
                      <button className="font-semibold hover:underline">Répondre</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
