'use client';

import { AppShell } from '@/components/app-shell';
import { GoalCard } from '@/components/goal-card';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';

const METRIC_TYPES = [
  { value: 'people_preached', label: 'Personnes évangélisées' },
  { value: 'people_followup', label: 'Personnes suivies' },
  { value: 'bibles_given', label: 'Bibles données' },
  { value: 'books_distributed', label: 'Livres distribués' },
  { value: 'tracts_distributed', label: 'Tracts distribués' },
  { value: 'publications_count', label: 'Nombre de publications' },
  { value: 'events_held', label: 'Événements organisés' },
];

export default function GoalsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    metricType: 'people_preached',
    targetValue: '',
    startDate: '',
    endDate: '',
    backfillMode: 'none',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data;
    },
  });

  const createGoal = useMutation({
    mutationFn: () =>
      api.post('/goals', {
        metricType: form.metricType,
        targetValue: parseInt(form.targetValue),
        startDate: form.startDate,
        endDate: form.endDate,
        backfillMode: form.backfillMode,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setForm({ metricType: 'people_preached', targetValue: '', startDate: '', endDate: '', backfillMode: 'none' });
    },
  });

  const pauseGoal = useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const resumeGoal = useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/resume`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const cancelGoal = useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const goals = data?.data ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mes objectifs</h1>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-1.5" /> Nouvel objectif
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Créer un objectif</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Métrique</label>
                <select
                  value={form.metricType}
                  onChange={(e) => setForm({ ...form, metricType: e.target.value })}
                  className="input"
                >
                  {METRIC_TYPES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif cible *</label>
                <input
                  type="number"
                  min={1}
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  className="input"
                  placeholder="ex: 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remplissage rétroactif</label>
                <select
                  value={form.backfillMode}
                  onChange={(e) => setForm({ ...form, backfillMode: e.target.value })}
                  className="input"
                >
                  <option value="none">Aucun</option>
                  <option value="count">Compter existantes</option>
                  <option value="full">Compter et intégrer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => createGoal.mutate()}
                disabled={!form.targetValue || !form.startDate || !form.endDate || createGoal.isPending}
                className="btn-primary"
              >
                {createGoal.isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun objectif. Créez-en un pour commencer à suivre vos progrès !
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((g: { id: string; metricType: string; targetValue: number; currentValue: number; status: string; startDate: string; endDate: string }) => (
              <GoalCard
                key={g.id}
                goal={g}
                onPause={() => pauseGoal.mutate(g.id)}
                onResume={() => resumeGoal.mutate(g.id)}
                onCancel={() => cancelGoal.mutate(g.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
