'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { User, MapPin, BookOpen } from 'lucide-react';

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const { data } = await api.get(`/members/${id}`);
      return data;
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!member) {
    return (
      <AppShell>
        <div className="text-center py-12 text-gray-500">Membre introuvable</div>
      </AppShell>
    );
  }

  const p = member.profile ?? {};

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="card space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{member.displayName}</h2>
              <span className="inline-block mt-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                {member.role}
              </span>
            </div>
          </div>

          {p.bio && <p className="text-gray-700">{p.bio}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {(p.city || p.country) && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                {[p.city, p.country].filter(Boolean).join(', ')}
              </div>
            )}
            {p.ministryName && (
              <div className="flex items-center gap-2 text-gray-600">
                <BookOpen className="h-4 w-4" />
                {p.ministryName}
              </div>
            )}
          </div>

          {p.favoriteBibleVerse && (
            <blockquote className="border-l-4 border-primary-200 pl-4 italic text-gray-600">
              {p.favoriteBibleVerse}
            </blockquote>
          )}
        </div>
      </div>
    </AppShell>
  );
}
