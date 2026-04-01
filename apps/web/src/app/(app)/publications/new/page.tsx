'use client';

import { AppShell } from '@/components/app-shell';
import { StatsForm } from '@/components/stats-form';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const TYPES = [
  { value: 'activity_report', label: 'Rapport d\'activité' },
  { value: 'testimony', label: 'Témoignage' },
  { value: 'prayer_request', label: 'Demande de prière' },
  { value: 'announcement', label: 'Annonce' },
  { value: 'event', label: 'Événement' },
  { value: 'encouragement', label: 'Encouragement' },
];

interface FormValues {
  type: string;
  content: string;
  location: string;
  eventDate: string;
  stats: {
    people_preached: number;
    people_followup: number;
    bibles_given: number;
    books_distributed: number;
    tracts_distributed: number;
  };
}

export default function NewPublicationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const methods = useForm<FormValues>({
    defaultValues: {
      type: 'activity_report',
      content: '',
      location: '',
      eventDate: '',
      stats: {
        people_preached: 0,
        people_followup: 0,
        bibles_given: 0,
        books_distributed: 0,
        tracts_distributed: 0,
      },
    },
  });

  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Record<string, unknown> = {
        type: values.type,
        content: values.content,
      };
      if (values.location) payload.location = values.location;
      if (values.eventDate) payload.eventDate = values.eventDate;
      if (values.type === 'activity_report') {
        payload.stats = values.stats;
      }
      return api.post('/publications', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      router.push('/');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Erreur lors de la création');
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle publication</h1>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit((v) => mutation.mutate(v))} className="card space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select {...methods.register('type')} className="input">
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
              <textarea
                {...methods.register('content', { required: true })}
                rows={6}
                className="input resize-y"
                placeholder="Partagez votre activité, témoignage ou annonce…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                <input {...methods.register('location')} className="input" placeholder="ex: Douala, Cameroun" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;événement</label>
                <input type="date" {...methods.register('eventDate')} className="input" />
              </div>
            </div>

            {methods.watch('type') === 'activity_report' && <StatsForm />}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => router.back()} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? 'Publication…' : 'Publier'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </AppShell>
  );
}
