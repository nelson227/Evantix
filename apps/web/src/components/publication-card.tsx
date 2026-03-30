'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  MessageCircle,
  Bookmark,
  Share2,
  MapPin,
  ThumbsUp,
  Globe,
  MoreHorizontal,
  Play,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api, mediaUrl, isVideo } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface Publication {
  id: string;
  type: string;
  narrativeText?: string;
  content?: string;
  locationName?: string;
  location?: string;
  stats?: Record<string, number>;
  media?: { id: string; url: string; width?: number; height?: number }[];
  author: { id: string; displayName: string; avatarUrl?: string };
  counters?: { likesCount: number; commentsCount: number; savesCount: number; sharesCount: number };
  _count?: { comments: number; likes: number };
  viewerState?: { liked: boolean; saved: boolean; canEdit?: boolean };
  createdAt: string;
}

interface PublicationCardProps {
  publication: Publication;
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
  const [likeCount, setLikeCount] = useState(
    publication.counters?.likesCount ?? publication._count?.likes ?? 0,
  );

  const commentCount = publication.counters?.commentsCount ?? publication._count?.comments ?? 0;
  const shareCount = publication.counters?.sharesCount ?? 0;
  const text = publication.narrativeText ?? publication.content ?? '';
  const location = publication.locationName ?? publication.location;
  const media = publication.media ?? [];

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      if (newLiked) await api.post(`/publications/${publication.id}/like`);
      else await api.delete(`/publications/${publication.id}/like`);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    }
  };

  const toggleSave = async () => {
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) await api.post(`/publications/${publication.id}/save`);
      else await api.delete(`/publications/${publication.id}/save`);
    } catch {
      setSaved(!newSaved);
    }
  };

  const share = async () => {
    await api.post(`/publications/${publication.id}/share`);
    qc.invalidateQueries({ queryKey: ['feed'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const stats = publication.stats;
  const hasStats = stats && Object.values(stats).some((v) => typeof v === 'number' && v > 0);

  return (
    <article className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
      {/* Header (Facebook-style) */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link href={`/profile/${publication.author.id}`} className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {publication.author.avatarUrl ? (
              <img
                src={mediaUrl(publication.author.avatarUrl)}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[15px] text-gray-900 hover:underline">
              {publication.author.displayName}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>
                {formatDistanceToNow(new Date(publication.createdAt), { addSuffix: true, locale: fr })}
              </span>
              <span>·</span>
              <Globe className="h-3 w-3" />
              {location && (
                <>
                  <span>·</span>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{location}</span>
                </>
              )}
            </div>
          </div>
        </Link>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <MoreHorizontal className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Type badge */}
      {publication.type && TYPE_LABELS[publication.type] && (
        <div className="px-4 pb-1">
          <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {TYPE_LABELS[publication.type]}
          </span>
        </div>
      )}

      {/* Text content */}
      {text && (
        <p className="text-[15px] text-gray-900 whitespace-pre-line px-4 pb-3 leading-relaxed">{text}</p>
      )}

      {/* Stats chips */}
      {hasStats && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {(stats.peoplePreached ?? stats.people_preached ?? 0) > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              🗣 {stats.peoplePreached ?? stats.people_preached} évangélisés
            </span>
          )}
          {(stats.peoplePrayedFor ?? stats.people_followup ?? 0) > 0 && (
            <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
              🙏 {stats.peoplePrayedFor ?? stats.people_followup} suivis
            </span>
          )}
          {(stats.booksDistributedTotal ?? stats.bibles_given ?? 0) > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
              📖 {stats.booksDistributedTotal ?? stats.bibles_given} livres/bibles
            </span>
          )}
          {(stats.tractsDistributedTotal ?? stats.tracts_distributed ?? 0) > 0 && (
            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
              📄 {stats.tractsDistributedTotal ?? stats.tracts_distributed} tracts
            </span>
          )}
        </div>
      )}

      {/* Media grid (Facebook-style) */}
      {media.length > 0 && <MediaGrid media={media} publicationId={publication.id} />}

      {/* Counters bar (Facebook-style) */}
      {(likeCount > 0 || commentCount > 0 || shareCount > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-[13px] text-gray-500">
          <div className="flex items-center gap-1.5">
            {likeCount > 0 && (
              <>
                <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-600">
                  <ThumbsUp className="h-2.5 w-2.5 text-white" />
                </span>
                <span>{likeCount}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {commentCount > 0 && (
              <Link href={`/publications/${publication.id}`} className="hover:underline">
                {commentCount} commentaire{commentCount > 1 ? 's' : ''}
              </Link>
            )}
            {shareCount > 0 && (
              <span>{shareCount} partage{shareCount > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* Action bar (Facebook-style) */}
      <div className="flex items-center border-t border-gray-200 mx-4">
        <button
          onClick={toggleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors rounded-lg hover:bg-gray-50 ${
            liked ? 'text-primary-600' : 'text-gray-500'
          }`}
        >
          <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-primary-600' : ''}`} />
          J&apos;aime
        </button>
        <Link
          href={`/publications/${publication.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-500 transition-colors rounded-lg hover:bg-gray-50"
        >
          <MessageCircle className="h-5 w-5" />
          Commenter
        </Link>
        <button
          onClick={share}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-500 transition-colors rounded-lg hover:bg-gray-50"
        >
          <Share2 className="h-5 w-5" />
          Partager
        </button>
        <button
          onClick={toggleSave}
          className={`px-3 py-2.5 transition-colors rounded-lg hover:bg-gray-50 ${
            saved ? 'text-amber-500' : 'text-gray-500'
          }`}
        >
          <Bookmark className={`h-5 w-5 ${saved ? 'fill-amber-500' : ''}`} />
        </button>
      </div>
    </article>
  );
}

/* ===== MEDIA GRID ===== */
function MediaGrid({ media, publicationId }: { media: { id: string; url: string }[]; publicationId: string }) {
  const count = media.length;

  if (count === 1) {
    return <MediaItem m={media[0]} pubId={publicationId} className="w-full aspect-[4/3]" />;
  }
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {media.map((m) => <MediaItem key={m.id} m={m} pubId={publicationId} className="w-full aspect-[3/4]" />)}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <div className="row-span-2">
          <MediaItem m={media[0]} pubId={publicationId} className="w-full h-full min-h-[300px]" />
        </div>
        <MediaItem m={media[1]} pubId={publicationId} className="w-full aspect-video" />
        <MediaItem m={media[2]} pubId={publicationId} className="w-full aspect-video" />
      </div>
    );
  }
  const shown = media.slice(0, 4);
  const extra = count - 4;
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {shown.map((m, i) => (
        <div key={m.id} className="relative">
          <MediaItem m={m} pubId={publicationId} className="w-full aspect-square" />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
              <span className="text-white text-3xl font-bold">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MediaItem({ m, pubId, className }: { m: { id: string; url: string }; pubId: string; className?: string }) {
  if (isVideo(m.url)) {
    return (
      <Link href={`/publications/${pubId}`} className={`block bg-black ${className}`}>
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[200px]">
          <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center">
            <Play className="h-7 w-7 text-white fill-white" />
          </div>
          <span className="text-gray-400 text-xs mt-2">Vidéo</span>
        </div>
      </Link>
    );
  }
  return (
    <Link href={`/publications/${pubId}`} className={`block ${className}`}>
      <img src={mediaUrl(m.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
    </Link>
  );
}
