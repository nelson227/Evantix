'use client';

import { AppShell } from '@/components/app-shell';
import { api, mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { User, MapPin, BookOpen, Phone, Save, Camera } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/me');
      return data;
    },
  });

  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    city: '',
    country: '',
    ministryName: '',
    favoriteBibleVerse: '',
    phoneNumber: '',
  });

  const startEdit = () => {
    if (profile?.profile) {
      setForm({
        displayName: profile.displayName || '',
        bio: profile.profile.bio || '',
        city: profile.profile.city || '',
        country: profile.profile.country || '',
        ministryName: profile.profile.ministryName || '',
        favoriteBibleVerse: profile.profile.favoriteBibleVerse || '',
        phoneNumber: profile.profile.phoneNumber || '',
      });
    }
    setEditing(true);
  };

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/me/profile', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
  });

  const uploadAvatar = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.append('files', files[0]);
    try {
      const { data: uploaded } = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (uploaded?.[0]?.url) {
        await api.patch('/me/profile', { avatarUrl: uploaded[0].url });
        qc.invalidateQueries({ queryKey: ['profile'] });
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const p = profile?.profile ?? {};
  const avatarSrc = p.avatarUrl ? mediaUrl(p.avatarUrl) : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          {!editing && (
            <button onClick={startEdit} className="btn-secondary">
              Modifier
            </button>
          )}
        </div>

        {editing ? (
          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;affichage</label>
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input resize-y" rows={3} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ministère</label>
              <input value={form.ministryName} onChange={(e) => setForm({ ...form, ministryName: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verset biblique favori</label>
              <input value={form.favoriteBibleVerse} onChange={(e) => setForm({ ...form, favoriteBibleVerse: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="input" type="tel" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary">Annuler</button>
              <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary">
                <Save className="h-4 w-4 mr-1.5" /> {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card space-y-4">
            {/* Avatar + Info (Facebook-style) */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-4 ring-white shadow">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-primary-600" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white hover:bg-gray-300 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-gray-700" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadAvatar(e.target.files)}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{profile?.displayName}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className="inline-block mt-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                  {user?.role}
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
              {p.phoneNumber && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {p.phoneNumber}
                </div>
              )}
            </div>

            {p.favoriteBibleVerse && (
              <blockquote className="border-l-4 border-primary-200 pl-4 italic text-gray-600">
                {p.favoriteBibleVerse}
              </blockquote>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
