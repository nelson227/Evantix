'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Shield, Users, Flag, Eye, EyeOff, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'users' | 'reports' | 'audit';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {([
            { key: 'users', label: 'Utilisateurs', icon: Users },
            { key: 'reports', label: 'Signalements', icon: Flag },
            { key: 'audit', label: 'Journal d\'audit', icon: Eye },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </AppShell>
  );
}

function UsersTab() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users');
      return data;
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const suspend = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const unsuspend = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/unsuspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data ?? [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-3 font-medium">Utilisateur</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Rôle</th>
            <th className="pb-3 font-medium">Statut</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: { id: string; displayName: string; email: string; role: string; suspendedAt: string | null }) => (
            <tr key={u.id} className="border-b border-gray-50">
              <td className="py-3 font-medium text-gray-900">{u.displayName}</td>
              <td className="py-3 text-gray-500">{u.email}</td>
              <td className="py-3">
                <select
                  value={u.role}
                  onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value })}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="member">Membre</option>
                  <option value="leader">Leader</option>
                  <option value="moderator">Modérateur</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="py-3">
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  u.suspendedAt ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
                )}>
                  {u.suspendedAt ? 'Suspendu' : 'Actif'}
                </span>
              </td>
              <td className="py-3">
                {u.suspendedAt ? (
                  <button onClick={() => unsuspend.mutate(u.id)} className="text-xs text-green-600 hover:underline">
                    Réactiver
                  </button>
                ) : (
                  <button onClick={() => suspend.mutate(u.id)} className="text-xs text-red-600 hover:underline">
                    Suspendre
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports');
      return data;
    },
  });

  const resolve = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: string }) =>
      api.patch(`/admin/reports/${reportId}/resolve`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const hidePublication = useMutation({
    mutationFn: (pubId: string) => api.post(`/admin/publications/${pubId}/hide`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const reports = data?.data ?? [];

  if (isLoading) return <LoadingSpinner />;

  if (reports.length === 0) {
    return <div className="text-center py-8 text-gray-500">Aucun signalement en attente</div>;
  }

  return (
    <div className="space-y-3">
      {reports.map((r: { id: string; reasonCode: string; description: string; publication?: { id: string; content: string }; reporter: { displayName: string }; createdAt: string }) => (
        <div key={r.id} className="card space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {r.reasonCode}
              </span>
              <p className="text-sm text-gray-700 mt-2">{r.description}</p>
              <p className="text-xs text-gray-400 mt-1">Par {r.reporter.displayName}</p>
            </div>
          </div>
          {r.publication && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              {r.publication.content.substring(0, 200)}…
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => resolve.mutate({ reportId: r.id, action: 'dismissed' })} className="btn-secondary text-xs">
              Rejeter
            </button>
            {r.publication && (
              <button onClick={() => hidePublication.mutate(r.publication!.id)} className="btn-danger text-xs">
                <EyeOff className="h-3.5 w-3.5 mr-1" /> Masquer la publication
              </button>
            )}
            <button onClick={() => resolve.mutate({ reportId: r.id, action: 'resolved' })} className="btn-primary text-xs">
              Résolu
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit-logs');
      return data;
    },
  });

  const logs = data?.data ?? [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-3 font-medium">Action</th>
            <th className="pb-3 font-medium">Utilisateur</th>
            <th className="pb-3 font-medium">Cible</th>
            <th className="pb-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l: { id: string; action: string; actor: { displayName: string }; targetType: string; targetId: string; createdAt: string }) => (
            <tr key={l.id} className="border-b border-gray-50">
              <td className="py-2 font-medium text-gray-900">{l.action}</td>
              <td className="py-2 text-gray-500">{l.actor.displayName}</td>
              <td className="py-2 text-gray-500">{l.targetType}:{l.targetId.substring(0, 8)}</td>
              <td className="py-2 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}
