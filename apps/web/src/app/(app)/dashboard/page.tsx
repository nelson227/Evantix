'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  Target,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/personal');
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

  const d = data ?? {};

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Publications"
            value={d.publicationsCount ?? 0}
            icon={BookOpen}
            color="bg-primary-50 text-primary-600"
          />
          <StatCard
            label="Personnes évangélisées"
            value={d.totalStats?.people_preached ?? 0}
            icon={Users}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            label="Bibles données"
            value={d.totalStats?.bibles_given ?? 0}
            icon={BookOpen}
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Objectifs actifs"
            value={d.activeGoalsCount ?? 0}
            icon={Target}
            color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Monthly trends */}
        {d.monthlyTrends && d.monthlyTrends.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Tendances mensuelles</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Mois</th>
                    <th className="pb-2 font-medium">Publications</th>
                    <th className="pb-2 font-medium">Évangélisés</th>
                    <th className="pb-2 font-medium">Suivis</th>
                    <th className="pb-2 font-medium">Bibles</th>
                  </tr>
                </thead>
                <tbody>
                  {d.monthlyTrends.map((m: { month: string; count: number; people_preached: number; people_followup: number; bibles_given: number }) => (
                    <tr key={m.month} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-900">{m.month}</td>
                      <td className="py-2">{m.count}</td>
                      <td className="py-2">{m.people_preached}</td>
                      <td className="py-2">{m.people_followup}</td>
                      <td className="py-2">{m.bibles_given}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active goals overview */}
        {d.goals && d.goals.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Objectifs en cours</h2>
            </div>
            <div className="space-y-3">
              {d.goals.map((g: { id: string; metricType: string; currentValue: number; targetValue: number }) => {
                const pct = Math.min(Math.round((g.currentValue / g.targetValue) * 100), 100);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{g.metricType.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
