import { Check, ChevronRight, Lock, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const branches = [
  { name: 'Push', skills: ['10 отжиманий', 'Жим 50 кг', 'Жим 80 кг'] },
  { name: 'Pull', skills: ['5 подтягиваний', '10 подтягиваний', 'Тяга 100 кг'] },
  { name: 'Legs', skills: ['Присед 60 кг', 'Присед 100 кг', 'Пистолетик'] },
  { name: 'Core', skills: ['Планка 60 сек', 'L-sit', 'Стойка на руках'] },
  { name: 'Cardio', skills: ['5 км', '10 км', 'Полумарафон'] },
];
const ranks = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export default function SkillTree() {
  const [selectedBranch, setSelectedBranch] = useState(0);
  useEffect(() => {
    const onBranchSelect = (event: Event) => {
      const branchName = (event as CustomEvent<string>).detail;
      const index = branches.findIndex((item) => item.name === branchName);
      if (index >= 0) setSelectedBranch(index);
    };
    window.addEventListener('ascend:skill-branch', onBranchSelect);
    return () => window.removeEventListener('ascend:skill-branch', onBranchSelect);
  }, []);
  const branch = branches[selectedBranch];
  return <section className="card-modern overflow-hidden">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-accent-blue">Progression map</p><h2 className="text-xl font-bold text-text">Дерево навыков</h2></div><Zap size={20} className="text-accent-gold" /></div>
    <div className="mb-5 flex gap-1 overflow-x-auto pb-1">{ranks.map((rank, index) => <span key={rank} className={`min-w-8 rounded-md px-2 py-1 text-center text-xs font-bold ${index < 2 ? 'bg-accent-green/15 text-accent-green' : index === 2 ? 'bg-accent-blue/15 text-accent-blue' : 'bg-bg-tertiary text-text-tertiary'}`}>{rank}</span>)}</div>
    <div className="mb-4 flex items-center gap-1 overflow-x-auto text-xs text-text-tertiary"><span>Дерево</span><ChevronRight size={14} /> <span className="text-accent-blue">{branch.name}</span></div>
    <div className="mb-4 flex gap-2 overflow-x-auto">{branches.map((item, index) => <button type="button" key={item.name} onClick={() => setSelectedBranch(index)} className={`min-w-20 rounded-lg border px-3 py-2 text-xs ${selectedBranch === index ? 'border-accent-blue bg-accent-blue/15 text-accent-blue shadow-[0_0_16px_rgba(79,70,229,.35)]' : 'border-border text-text-tertiary'}`}>{item.name}</button>)}</div>
    <div className="relative mx-auto max-w-xl"><div className="absolute left-6 top-5 h-[calc(100%-40px)] w-px bg-gradient-to-b from-accent-blue via-border to-transparent" />{branch.skills.map((skill, skillIndex) => { const unlocked = skillIndex === 0; const available = skillIndex === 1 && unlocked; const state = unlocked ? 'unlocked' : available ? 'available' : 'locked'; return <button type="button" key={skill} className={`relative mb-3 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm ${state === 'unlocked' ? 'border-accent-green/50 bg-accent-green/10 text-accent-green' : state === 'available' ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue shadow-[0_0_16px_rgba(79,70,229,.3)]' : 'border-border bg-bg-tertiary/60 text-text-tertiary blur-[.3px]'}`}><span className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-bg">{state === 'unlocked' ? <Check size={14} /> : state === 'available' ? <Zap size={14} /> : <Lock size={13} />}</span><span className="flex-1">{skill}</span><span className="text-[10px] uppercase tracking-wider">{state}</span></button>; })}</div>
  </section>;
}
