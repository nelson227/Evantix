'use client';

import { Target, TrendingUp, CheckCircle2, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: {
    id: string;
    metricType: string;
    targetValue: number;
    currentValue: number;
    status: string;
    startDate: string;
    endDate: string;
  };
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  people_preached: 'Personnes évangélisées',
  people_followup: 'Personnes suivies',
  bibles_given: 'Bibles données',
  books_distributed: 'Livres distribués',
  tracts_distributed: 'Tracts distribués',
  publications_count: 'Publications',
  events_held: 'Événements organisés',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  active: { label: 'Actif', color: 'bg-green-50 text-green-700', icon: TrendingUp },
  completed: { label: 'Terminé', color: 'bg-primary-50 text-primary-700', icon: CheckCircle2 },
  paused: { label: 'En pause', color: 'bg-amber-50 text-amber-700', icon: Pause },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

export function GoalCard({ goal, onPause, onResume, onCancel }: GoalCardProps) {
  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const statusConf = STATUS_CONFIG[goal.status] || STATUS_CONFIG.active;
  const StatusIcon = statusConf.icon;

  const start = new Date(goal.startDate).toLocaleDateString('fr-FR');
  const end = new Date(goal.endDate).toLocaleDateString('fr-FR');

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">
            {METRIC_LABELS[goal.metricType] || goal.metricType}
          </h3>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', statusConf.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusConf.label}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-600">{goal.currentValue} / {goal.targetValue}</span>
          <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress >= 100 ? 'bg-green-500' : 'bg-primary-500',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        {start} → {end}
      </div>

      {goal.status === 'active' && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {onPause && (
            <button onClick={onPause} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
              Mettre en pause
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-red-600 hover:text-red-700 font-medium">
              Annuler
            </button>
          )}
        </div>
      )}
      {goal.status === 'paused' && onResume && (
        <div className="pt-2 border-t border-gray-100">
          <button onClick={onResume} className="text-xs text-green-600 hover:text-green-700 font-medium">
            Reprendre
          </button>
        </div>
      )}
    </div>
  );
}
