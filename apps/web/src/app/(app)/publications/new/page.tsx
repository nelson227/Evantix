'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X, Play, MapPin, Calendar } from 'lucide-react';

const TYPES = [
  { value: 'past_outreach', label: 'Rapport de sortie' },
  { value: 'testimony', label: 'Témoignage' },
  { value: 'prayer_request', label: 'Demande de prière' },
  { value: 'future_event', label: 'Événement à venir' },
];

const STAT_FIELDS = [
  { key: 'peoplePreached', label: 'Personnes évangélisées' },
  { key: 'peoplePrayedFor', label: 'Personnes priées' },
  { key: 'peopleMet', label: 'Personnes rencontrées' },
  { key: 'booksDistributedTotal', label: 'Livres distribués' },
  { key: 'tractsDistributedTotal', label: 'Tracts distribués' },
  { key: 'housesVisited', label: 'Maisons visitées' },
  { key: 'teamSize', label: 'Taille de l\'équipe' },
];

function isVideoFile(file: File) {
  return file.type.startsWith('video/');
}

export default function NewPublicationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState('past_outreach');
  const [narrativeText, setNarrativeText] = useState('');
  const [locationName, setLocationName] = useState('');
  const [outreachDate, setOutreachDate] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setMediaFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      if (isVideoFile(f)) {
        setMediaPreviews((prev) => [...prev, 'video']);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(f);
      }
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let mediaUrls: string[] = [];

      // Upload files first if any
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        mediaFiles.forEach((f) => formData.append('files', f));
        const { data: uploaded } = await api.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        mediaUrls = uploaded.map((u: { url: string }) => u.url);
      }

      // Create publication
      const payload: Record<string, unknown> = {
        type,
        narrativeText,
      };
      if (locationName) payload.locationName = locationName;
      if (type === 'past_outreach' && outreachDate) payload.outreachDate = outreachDate;
      if (type === 'future_event') {
        if (eventStartAt) payload.eventStartAt = eventStartAt;
        if (eventEndAt) payload.eventEndAt = eventEndAt;
      }
      if (type === 'past_outreach') {
        const hasStats = Object.values(stats).some((v) => v > 0);
        if (hasStats) payload.stats = stats;
      }
      if (mediaUrls.length > 0) payload.mediaUrls = mediaUrls;

      return api.post('/publications', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.push('/');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors de la création');
    },
    onSettled: () => setUploading(false),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle publication</h1>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
              <textarea
                value={narrativeText}
                onChange={(e) => setNarrativeText(e.target.value)}
                rows={6}
                maxLength={5000}
                className="input resize-y"
                placeholder="Partagez votre activité, témoignage ou annonce…"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{narrativeText.length}/5000</p>
            </div>

            {/* Location & Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline h-3.5 w-3.5 mr-1" />Lieu
                </label>
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="input"
                  placeholder="ex: Douala, Cameroun"
                />
              </div>
              {type === 'past_outreach' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />Date de sortie
                  </label>
                  <input
                    type="date"
                    value={outreachDate}
                    onChange={(e) => setOutreachDate(e.target.value)}
                    className="input"
                  />
                </div>
              )}
              {type === 'future_event' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
                    <input
                      type="datetime-local"
                      value={eventStartAt}
                      onChange={(e) => setEventStartAt(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                    <input
                      type="datetime-local"
                      value={eventEndAt}
                      onChange={(e) => setEventEndAt(e.target.value)}
                      className="input"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Stats (only for past_outreach) */}
            {type === 'past_outreach' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Statistiques (optionnel)</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {STAT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                      <input
                        type="number"
                        min={0}
                        value={stats[field.key] || ''}
                        onChange={(e) =>
                          setStats((prev) => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))
                        }
                        className="input text-sm py-2"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media upload (Facebook-style) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos / Vidéos
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />

              {/* Media preview grid */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {mediaPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {preview === 'video' ? (
                        <div className="w-full h-full bg-black flex flex-col items-center justify-center">
                          <Play className="h-8 w-8 text-white fill-white" />
                          <span className="text-gray-400 text-xs mt-1">{mediaFiles[i]?.name}</span>
                        </div>
                      ) : (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
              >
                <ImagePlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-600">
                  Cliquez pour ajouter des photos ou vidéos
                </span>
                <br />
                <span className="text-xs text-gray-400">
                  JPG, PNG, WebP, GIF, MP4, MOV, WebM (max 50 Mo)
                </span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => router.back()} className="btn-secondary">
                Annuler
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!narrativeText.trim() || mutation.isPending || uploading}
                className="btn-primary"
              >
                {uploading ? 'Upload en cours…' : mutation.isPending ? 'Publication…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
