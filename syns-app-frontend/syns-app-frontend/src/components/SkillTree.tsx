import { Check, Lock, Zap } from 'lucide-react';

const branches = [
  { name: 'Push', skills: ['10 отжиманий', 'Жим 50 кг', 'Жим 80 кг'] },
  { name: 'Pull', skills: ['5 подтягиваний', '10 подтягиваний', 'Тяга 100 кг'] },
  { name: 'Legs', skills: ['Присед 60 кг', 'Присед 100 кг', 'Пистолетик'] },
  { name: 'Core', skills: ['Планка 60 сек', 'L-sit', 'Стойка на руках'] },
  { name: 'Cardio', skills: ['5 км', '10 км', 'Полумарафон'] },
];
const ranks = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export default function SkillTree() {
  return <section className="card-modern overflow-hidden">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-accent-blue">Progression map</p><h2 className="text-xl font-bold text-text">Дерево навыков</h2></div><Zap size={20} className="text-accent-gold" /></div>
    <div className="mb-5 flex gap-1 overflow-x-auto pb-1">{ranks.map((rank, index) => <span key={rank} className={`min-w-8 rounded-md px-2 py-1 text-center text-xs font-bold ${index < 2 ? 'bg-accent-green/15 text-accent-green' : index === 2 ? 'bg-accent-blue/15 text-accent-blue' : 'bg-bg-tertiary text-text-tertiary'}`}>{rank}</span>)}</div>
    <div className="grid gap-4 md:grid-cols-5">{branches.map((branch, branchIndex) => <div key={branch.name} className="relative"><div className="mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-accent-blue" /><h3 className="text-sm font-semibold text-text">{branch.name}</h3></div><div className="space-y-2 border-l border-border pl-4">{branch.skills.map((skill, skillIndex) => { const complete = branchIndex === 0 && skillIndex === 0; const active = skillIndex === (branchIndex % 2) && !complete; return <div key={skill} className={`relative flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${complete ? 'border-accent-green/40 bg-accent-green/10 text-accent-green' : active ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue' : 'border-border bg-bg-tertiary/50 text-text-tertiary'}`}><span className="absolute -left-[21px] h-px w-4 bg-border" />{complete ? <Check size={14} /> : active ? <Zap size={14} /> : <Lock size={13} />}{skill}</div>; })}</div></div>)}</div>
  </section>;
}
