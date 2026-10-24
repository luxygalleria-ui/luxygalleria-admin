'use client';

import React from 'react';

const inputClass = (error?: string) =>
  `w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/30 ${error ? 'border-red-400' : 'border-slate-300'}`;

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint ? <span className="block text-xs text-slate-500 mt-1">{hint}</span> : null}
    </label>
  );
}

/** Number input that keeps the raw text while typing; reports NaN for empty/invalid so the server rejects it visibly. */
export function NumberInput({ value, onChange, error, step = 'any', min = 0, suffix }: {
  value: number | null; onChange: (n: number) => void; error?: string; step?: string; min?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number" inputMode="decimal" step={step} min={min}
        value={value === null || Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        className={inputClass(error)}
      />
      {suffix && <span className="text-sm text-slate-500 shrink-0">{suffix}</span>}
    </div>
  );
}

export function TextInput({ value, onChange, error, placeholder, multiline }: {
  value: string; onChange: (s: string) => void; error?: string; placeholder?: string; multiline?: boolean;
}) {
  return multiline
    ? <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${inputClass(error)} resize-y`} />
    : <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass(error)} />;
}

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input type="checkbox" className="mt-1 w-4 h-4 accent-[#8B5E34]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function Card({ title, description, children, right }: { title: string; description?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Loading, load-error and "still on defaults" states shared by every checkout page. */
export function SectionState({ loading, loadError, reload, isDefault, defaultNote }: {
  loading: boolean; loadError: string; reload: () => void; isDefault: boolean; defaultNote: string;
}) {
  if (loading) return <div className="p-6 text-sm text-slate-500 animate-pulse">Loading saved settings…</div>;
  if (loadError) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-xl text-sm text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>{loadError}</span>
        <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium">Retry</button>
      </div>
    );
  }
  if (isDefault) return <div className="p-3 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-800">{defaultNote}</div>;
  return null;
}

/** Sticky save/cancel bar. Disabled until something changed. */
export function SaveBar({ dirty, saving, onSave, onCancel }: { dirty: boolean; saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 bg-white/95 backdrop-blur border-t sm:border sm:rounded-xl border-slate-200 p-3 sm:p-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
      {dirty && <span className="text-xs text-amber-700 sm:mr-auto">You have unsaved changes</span>}
      <button onClick={onCancel} disabled={!dirty || saving} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 disabled:opacity-50">
        Cancel
      </button>
      <button onClick={onSave} disabled={!dirty || saving} className="px-4 py-2 rounded-lg bg-[#8B5E34] text-white text-sm font-semibold hover:bg-[#6B5344] disabled:bg-slate-400">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
