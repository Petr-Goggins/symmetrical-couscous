import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Lock, X, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

const branches = [
  { name: 'Push', skills: [{ title: '10 отжиманий', target: 10, terms: ['отжим'] }, { title: 'Жим 50 кг', target: 50, terms: ['жим'] }, { title: 'Жим 80 кг', target: 80, terms: ['жим'] }] },
  { name: 'Pull', skills: [{ title: '5 подтягиваний', target: 5, terms: ['подтяг'] }, { title: '10 подтягиваний', target: 10, terms: ['подтяг'] }, { title: 'Тяга 100 кг', target: 100, terms: ['тяга'] }] },
  { name: 'Legs', skills: [{ title: 'Присед 60 кг', target: 60, terms: ['присед'] }, { title: 'Присед 100 кг', target: 100, terms: ['присед'] }, { title: 'Пистолетик', target: 1, terms: ['пистолет'] }] },
  { name: 'Core', skills: [{ title: 'Планка 60 сек', target: 60, terms: ['планк'] }, { title: 'L-sit', target: 1, terms: ['l-sit'] }, { title: 'Стойка на руках', target: 1, terms: ['стойк'] }] },
  { name: 'Cardio', skills: [{ title: '5 км', target: 5, terms: ['бег', 'км'] }, { title: '10 км', target: 10, terms: ['бег', 'км'] }, { title: 'Полумарафон', target: 21, terms: ['бег', 'км'] }] },
];
const ranks = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
type Log = { exercise_name: string; weight: number; reps: number; sets: number };

export default function SkillTree() {
  const user = useAuthStore((state) => state.user);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<{ title: string; target: number; progress: number; rank: string } | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data, error } = await supabase.from('workout_logs').select('exercise_name, weight, reps, sets').eq('user_id', user.id);
        if (error) throw error;
        setLogs((data ?? []) as Log[]);
      } catch (error) { console.error('Skill tree load error', error); }
    };
    void load();
  }, [user]);

  const progressFor = (skill: (typeof branches)[number]['skills'][number]) => logs.filter((log) => skill.terms.some((term) => log.exercise_name.toLowerCase().includes(term))).reduce((max, log) => Math.max(max, Number(log.weight) || Number(log.reps) || 0), 0);
  const toggleBranch = (index: number) => { setSelectedBranch(index); setExpanded((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]); };
  const branch = branches[selectedBranch];

  return <section className="card-modern overflow-hidden">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-accent-blue">Progression map</p><h2 className="text-xl font-bold text-text">Дерево навыков</h2></div><Zap size={20} className="text-accent-blue" /></div>
    <div className="mb-5 flex gap-1 overflow-x-auto pb-1">{ranks.map((rank) => <span key={rank} className="min-w-8 rounded-md bg-bg-tertiary px-2 py-1 text-center text-xs font-bold text-text-tertiary">{rank}</span>)}</div>
    <div className="mb-4 flex items-center gap-1 text-xs text-text-tertiary"><span>Дерево</span><ChevronRight size={14} /><span className="text-accent-blue">{branch.name}</span></div>
    <div className="grid gap-2 md:grid-cols-5">{branches.map((item, index) => <button type="button" key={item.name} onClick={() => toggleBranch(index)} className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${selectedBranch === index ? 'border-accent-blue bg-accent-blue/15 text-accent-blue' : 'border-border text-text-secondary hover:border-accent-blue/60'}`}><span>{item.name}</span>{expanded.includes(index) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>)}</div>
    {expanded.includes(selectedBranch) && <div className="relative mt-4 max-w-xl space-y-2 border-l border-accent-blue/40 pl-5">{branch.skills.map((skill, skillIndex) => { const progress = progressFor(skill); const previous = skillIndex === 0 || progressFor(branch.skills[skillIndex - 1]) >= branch.skills[skillIndex - 1].target; const unlocked = progress >= skill.target; const available = !unlocked && previous; const state = unlocked ? 'unlocked' : available ? 'available' : 'locked'; const rank = unlocked ? ranks[Math.min(ranks.length - 1, Math.floor(progress / skill.target))] : 'E'; return <button type="button" key={skill.title} disabled={state === 'locked'} onClick={() => setSelectedSkill({ title: skill.title, target: skill.target, progress, rank })} className={`relative flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition ${state === 'unlocked' ? 'border-accent-green/50 bg-accent-green/10 text-accent-green' : state === 'available' ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue' : 'cursor-not-allowed border-border bg-bg-tertiary/50 text-text-tertiary opacity-60'}`}><span className="absolute -left-[21px] h-2 w-2 rounded-full bg-current" />{state === 'unlocked' ? <Check size={15} /> : state === 'available' ? <Zap size={15} /> : <Lock size={14} />}<span className="flex-1">{skill.title}</span><span className="text-[10px] uppercase tracking-wider">{state === 'unlocked' ? rank : state}</span></button>; })}</div>}
    {selectedSkill && <div className="mt-4 rounded-lg border border-accent-blue/30 bg-accent-blue/10 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-text">{selectedSkill.title}</h3><p className="mt-1 text-sm text-text-secondary">Ранг: <strong className="text-accent-blue">{selectedSkill.rank}</strong> · Прогресс: {selectedSkill.progress} / {selectedSkill.target}</p><div className="mt-3 h-2 rounded-full bg-bg-tertiary"><div className="h-full rounded-full bg-accent-blue" style={{ width: `${Math.min(100, selectedSkill.progress / selectedSkill.target * 100)}%` }} /></div><p className="mt-2 text-xs text-text-tertiary">До следующего ранга: {Math.max(0, selectedSkill.target - selectedSkill.progress)} ед.</p></div><button type="button" aria-label="Закрыть детали навыка" onClick={() => setSelectedSkill(null)} className="text-text-tertiary hover:text-text"><X size={16} /></button></div></div>}
  </section>;
}
