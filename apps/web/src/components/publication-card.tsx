'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface PublicationCardProps {
  publication: {
    id: string;
    type: string;
    content: string;
    location?: string;
    eventDate?: string;
    stats?: Record<string, number>;
    author: { id: string; displayName: string };
    _count: { comments: number; likes: number };
    viewerState: { liked: boolean; saved: boolean };
    createdAt: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  activity_report: 'Rapport d\'activité',
  testimony: 'Témoignage',
  prayer_request: 'Demande de prière',
  announcement: 'Annonce',
  event: 'Événement',
  encouragement: 'Encouragement',
};

export function PublicationCard({ publication }: PublicationCardProps) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState(publication.viewerState?.liked ?? false);
  const [saved, setSaved] = useState(publication.viewerState?.saved ?? false);
  const [likeCount, setLikeCount] = useState(publication._count?.likes ?? 0);

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      if (newLiked) {
        await api.post(`/publications/${publication.id}/like`);
      } else {
        await api.delete(`/publications/${publication.id}/like`);
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    }
  };

  const toggleSave = async () => {
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) {
        await api.post(`/publications/${publication.id}/save`);
      } else {
        await api.delete(`/publications/${publication.id}/save`);
      }
    } catch {
      setSaved(!newSaved);
    }
  };

  const share = async () => {
    await api.post(`/publications/${publication.id}/share`);
    qc.invalidateQueries({ queryKey: ['feed'] });
  };

  const stats = publication.stats;
  const hasStats = stats && Object.values(stats).some((v) => v > 0);

  return (
    <article className="card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/profile/${publication.author.id}`} className="font-semibold text-gray-900 hover:underline">
            {publication.author.displayName}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              {TYPE_LABELS[publication.type] || publication.type}
            </span>
            <span>
              {formatDistanceToNow(new Date(publication.createdAt), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-700 whitespace-pre-line">{publication.content}</p>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {publication.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {publication.location}
          </span>
        )}
        {publication.eventDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {new Date(publication.eventDate).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {/* Stats badges */}
      {hasStats && (
        <div className="flex flex-wrap gap-2">
          {stats.people_preached !== undefined && stats.people_preached > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              {stats.people_preached} personnes évangélisées
            </span>
          )}
          {stats.people_followup !== undefined && stats.people_followup > 0 && (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
              {stats.people_followup} suivis
            </span>
          )}
          {stats.bibles_given !== undefined && stats.bibles_given > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
              {stats.bibles_given} bibles données
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
          <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
          {likeCount > 0 && likeCount}
        </button>
        <Link href={`/publications/${publication.id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <MessageCircle className="h-4 w-4" />
          {publication._count.comments > 0 && publication._count.comments}
        </Link>
        <button onClick={toggleSave} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-500 transition-colors">
          <Bookmark className={`h-4 w-4 ${saved ? 'fill-amber-500 text-amber-500' : ''}`} />
        </button>
        <button onClick={share} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
