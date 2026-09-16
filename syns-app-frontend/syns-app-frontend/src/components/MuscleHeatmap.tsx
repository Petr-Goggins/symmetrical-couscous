import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

const muscles = ['Грудные', 'Бицепс', 'Трицепс', 'Пресс', 'Ноги', 'Спина', 'Плечи'];
const muscleMapping: Record<string, string[]> = { грудь: ['Грудные'], жим: ['Грудные', 'Трицепс', 'Плечи'], бицепс: ['Бицепс'], трицепс: ['Трицепс'], присед: ['Ноги'], ноги: ['Ноги'], тяга: ['Спина', 'Бицепс'], спина: ['Спина'], пресс: ['Пресс'], планка: ['Пресс'], плеч: ['Плечи'] };
const branchForMuscle = (muscle: string) => ['Грудные', 'Трицепс', 'Плечи'].includes(muscle) ? 'Push' : ['Спина', 'Бицепс'].includes(muscle) ? 'Pull' : muscle === 'Ноги' ? 'Legs' : muscle === 'Пресс' ? 'Core' : 'Cardio';

export default function MuscleHeatmap() {
  const user = useAuthStore((state) => state.user);
  const [back, setBack] = useState(false);
  const [load, setLoad] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (!user) return;
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const loadLogs = async () => {
      try {
        const { data, error } = await supabase.from('workout_logs').select('exercise_name, weight, sets, reps, log_date').eq('user_id', user.id).gte('log_date', from);
        if (error) throw error;
        const next: Record<string, number> = {};
        data?.forEach((log) => { const key = Object.keys(muscleMapping).find((item) => log.exercise_name.toLowerCase().includes(item)); muscleMapping[key ?? '']?.forEach((muscle) => { next[muscle] = (next[muscle] ?? 0) + Number(log.weight || 0) * Number(log.sets || 0) * Number(log.reps || 0); }); });
        setLoad(next);
      } catch (error) { console.error('Muscle heatmap error', error); }
    };
    loadLogs();
  }, [user]);
  const intensity = (muscle: string) => { const value = load[muscle] ?? 0; return value > 3000 ? '#ef4444' : value > 900 ? '#facc15' : '#22c55e'; };
  const selectMuscle = (muscle: string) => { setSelected(muscle); window.dispatchEvent(new CustomEvent('ascend:skill-branch', { detail: branchForMuscle(muscle) })); };
  const zoneClass = (muscle: string) => `transition-opacity hover:opacity-70 ${selected === muscle ? 'stroke-white stroke-[3]' : ''}`;
  return <section className="card-modern"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-accent-orange">7 дней</p><h2 className="text-xl font-bold text-text">Тепловая карта мышц</h2></div><button type="button" onClick={() => setBack((value) => !value)} className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs"><RotateCcw size={14} /> {back ? 'Сзади' : 'Спереди'}</button></div><div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start"><svg viewBox="0 0 180 260" className="h-64 w-44" role="img" aria-label={back ? 'Задняя карта мышц' : 'Передняя карта мышц'}><circle cx="90" cy="25" r="18" fill={intensity(back ? 'Спина' : 'Плечи')} onClick={() => selectMuscle(back ? 'Спина' : 'Плечи')} /><path d="M62 52 Q90 42 118 52 L126 140 L112 150 L105 245 L90 250 L75 245 L68 150 L54 140 Z" fill={intensity(back ? 'Спина' : 'Грудные')} opacity=".9" className={zoneClass(back ? 'Спина' : 'Грудные')} onClick={() => selectMuscle(back ? 'Спина' : 'Грудные')} /><g className={zoneClass('Плечи')} role="button" tabIndex={0} onClick={() => selectMuscle('Плечи')}><path d="M63 57 L35 115 L48 122 L72 82 M117 57 L145 115 L132 122 L108 82" fill={intensity('Плечи')} /></g><path d="M72 140 L58 245 L84 245 L90 150 M108 140 L122 245 L96 245 L90 150" fill={intensity('Ноги')} opacity=".9" className={zoneClass('Ноги')} onClick={() => selectMuscle('Ноги')} /><path d="M70 96 L110 96 L105 138 L75 138 Z" fill={intensity(back ? 'Спина' : 'Пресс')} opacity=".8" className={zoneClass(back ? 'Спина' : 'Пресс')} onClick={() => selectMuscle(back ? 'Спина' : 'Пресс')} /></svg><div className="w-full space-y-3">{muscles.map((muscle) => <button type="button" key={muscle} onClick={() => selectMuscle(muscle)} className={`flex w-full items-center gap-3 text-sm ${selected === muscle ? 'text-text' : ''}`}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: intensity(muscle) }} /><span className="flex-1 text-left text-text-secondary">{muscle}</span><span className="text-xs text-text-tertiary">{Math.round(load[muscle] ?? 0)} ед.</span></button>)}{selected && <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/10 p-3 text-xs text-text-secondary">{selected}: нагрузка {Math.round(load[selected] ?? 0)} ед. Открыта ветка <strong className="text-accent-blue">{branchForMuscle(selected)}</strong> в дереве навыков.</div>}</div></div></section>;
}
