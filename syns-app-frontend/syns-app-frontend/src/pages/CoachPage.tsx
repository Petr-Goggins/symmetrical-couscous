import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Dumbbell, Target, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '@/components/TopBar';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';

const GOALS = [['lose', 'Похудение'], ['gain', 'Набор мышечной массы'], ['strength', 'Увеличение силы'], ['custom', 'Своя цель']] as const;
const LEVELS = [['beginner', 'Начинающий'], ['intermediate', 'Средний'], ['advanced', 'Продвинутый'], ['professional', 'Профессиональный']] as const;
const INVENTORY = ['Свой вес', 'Гантели', 'Штанга', 'Турник', 'Зал', 'Резинки'];
const INJURIES = [['none', 'Нет'], ['back', 'Спина'], ['knees', 'Колени'], ['shoulders', 'Плечи'], ['other', 'Другое']];
const MUSCLES = ['Грудные', 'Бицепс', 'Трицепс', 'Пресс', 'Ноги', 'Спина', 'Плечи'];
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

function Choice({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition ${active ? 'border-accent-blue bg-accent-blue/15 text-accent-blue' : 'border-border text-text-secondary hover:border-text-tertiary'}`}>{label}{active && <Check size={16} />}</button>;
}

export default function CoachPage({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const user = useAuthStore((state) => state.user);
  const { profile, updateProfile } = useProfileStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ goal: 'lose', customGoal: '', currentWeight: profile?.weight?.toString() ?? '', targetWeight: profile?.target_weight?.toString() ?? '', level: profile?.training_level ?? 'beginner', inventory: profile?.equipment ?? [], injury: 'none', muscles: profile?.weak_muscles ?? [], personalGoal: '', preferences: '' });
  const weeks = useMemo(() => { const current = Number(form.currentWeight); const target = Number(form.targetWeight); return Number.isFinite(current) && Number.isFinite(target) && current !== target ? Math.max(1, Math.ceil(Math.abs(current - target) / 0.5)) : 0; }, [form.currentWeight, form.targetWeight]);
  const forecast = weeks ? new Date(Date.now() + weeks * 7 * 86400000).toLocaleDateString('ru-RU') : null;
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const success = await updateProfile(user.id, { weight: Number(form.currentWeight), start_weight: Number(form.currentWeight), target_weight: Number(form.targetWeight), goal: form.goal === 'custom' ? 'maintain' : form.goal, training_level: form.level === 'professional' ? 'advanced' : form.level, equipment: form.inventory, inventory: form.inventory, weak_muscles: form.muscles, focus_muscles: form.muscles, injuries: form.injury === 'none' ? [] : [form.injury], personal_goal: form.personalGoal || null, preferences: form.preferences || null });
      if (!success) throw new Error('Не удалось сохранить анкету');
      toast.success('Анкета сохранена');
      navigate('/dashboard');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось сохранить анкету'); } finally { setSaving(false); }
  };

  if (!user) return null;
  const StepIcon = [Target, Dumbbell, UserRound][step];
  return <div>
    <TopBar title="Анкета Ascend" onOpenSidebar={onOpenSidebar} />
    <main className="mx-auto max-w-2xl animate-slide-up p-4 lg:p-8">
      <div className="mb-6 flex gap-2">{[0, 1, 2].map((item) => <div key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-accent-blue' : 'bg-bg-tertiary'}`} />)}</div>
      <div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue"><StepIcon size={20} /></div><div><p className="text-xs text-text-tertiary">Шаг {step + 1} из 3</p><h2 className="text-lg font-bold text-text">{['Цель и прогноз', 'Опыт и условия', 'Фокус развития'][step]}</h2></div></div>
      <section className="card space-y-5 p-6">
        {step === 0 && <><div className="grid gap-2 sm:grid-cols-2">{GOALS.map(([value, label]) => <Choice key={value} active={form.goal === value} label={label} onClick={() => update('goal', value)} />)}</div>{form.goal === 'custom' && <input className="input-field w-full px-3 py-2.5 text-sm" placeholder="Опишите цель" value={form.customGoal} onChange={(event) => update('customGoal', event.target.value)} />}<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-text-secondary">Текущий вес, кг<input required type="number" min="1" className="input-field mt-2 w-full px-3 py-2.5 text-text" value={form.currentWeight} onChange={(event) => update('currentWeight', event.target.value)} /></label><label className="text-sm text-text-secondary">Целевой вес, кг<input required type="number" min="1" className="input-field mt-2 w-full px-3 py-2.5 text-text" value={form.targetWeight} onChange={(event) => update('targetWeight', event.target.value)} /></label></div><div className="rounded-lg border border-accent-blue/20 bg-accent-blue/10 p-4 text-sm text-text-secondary">{forecast ? <>Вы достигнете цели через <strong className="text-text">{weeks} недель</strong> ({forecast})</> : 'Введите текущий и целевой вес для прогноза'}</div></>}
        {step === 1 && <><div><p className="mb-2 text-sm font-medium text-text-secondary">Уровень подготовки</p><div className="grid gap-2 sm:grid-cols-2">{LEVELS.map(([value, label]) => <Choice key={value} active={form.level === value} label={label} onClick={() => update('level', value)} />)}</div></div><div><p className="mb-2 text-sm font-medium text-text-secondary">Инвентарь</p><div className="grid gap-2 sm:grid-cols-2">{INVENTORY.map((item) => <Choice key={item} active={form.inventory.includes(item)} label={item} onClick={() => update('inventory', toggle(form.inventory, item))} />)}</div></div><div><p className="mb-2 text-sm font-medium text-text-secondary">Травмы</p><div className="flex flex-wrap gap-2">{INJURIES.map(([value, label]) => <Choice key={value} active={form.injury === value} label={label} onClick={() => update('injury', value)} />)}</div></div></>}
        {step === 2 && <><div><p className="mb-2 text-sm font-medium text-text-secondary">Фокусные мышцы</p><div className="grid gap-2 sm:grid-cols-2">{MUSCLES.map((item) => <Choice key={item} active={form.muscles.includes(item)} label={item} onClick={() => update('muscles', toggle(form.muscles, item))} />)}</div></div><label className="block text-sm text-text-secondary">Личная цель <span className="text-text-tertiary">(необязательно)</span><input className="input-field mt-2 w-full px-3 py-2.5 text-text" value={form.personalGoal} onChange={(event) => update('personalGoal', event.target.value)} /></label><label className="block text-sm text-text-secondary">Предпочтения <span className="text-text-tertiary">(необязательно)</span><textarea className="input-field mt-2 min-h-24 w-full px-3 py-2.5 text-text" value={form.preferences} onChange={(event) => update('preferences', event.target.value)} /></label></>}
      </section>
      <div className="mt-6 flex justify-between"><button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="btn-secondary flex items-center gap-2 px-4 py-2.5 disabled:opacity-30"><ArrowLeft size={17} /> Назад</button>{step < 2 ? <button type="button" onClick={() => setStep((current) => current + 1)} className="btn-primary flex items-center gap-2 px-6 py-2.5">Далее <ArrowRight size={17} /></button> : <button type="button" onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50">{saving ? 'Сохраняем...' : 'Сохранить'} <Check size={17} /></button>}</div>
    </main>
  </div>;
}
