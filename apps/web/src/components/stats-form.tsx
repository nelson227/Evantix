'use client';

import { useFormContext } from 'react-hook-form';

const STAT_FIELDS = [
  { name: 'stats.people_preached', label: 'Personnes évangélisées' },
  { name: 'stats.people_followup', label: 'Personnes suivies' },
  { name: 'stats.bibles_given', label: 'Bibles données' },
  { name: 'stats.books_distributed', label: 'Livres distribués' },
  { name: 'stats.tracts_distributed', label: 'Tracts distribués' },
];

export function StatsForm() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Statistiques (optionnel)</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STAT_FIELDS.map((field) => (
          <div key={field.name}>
            <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
            <input
              type="number"
              min={0}
              {...register(field.name, { valueAsNumber: true })}
              className="input text-sm py-2"
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
