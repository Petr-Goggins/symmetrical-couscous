import { useEffect, useState } from 'react';
import { Activity, Moon, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import MuscleHeatmap from '@/components/MuscleHeatmap';
import GitHubCalendar from '@/components/GitHubCalendar';
import SkillTree from '@/components/SkillTree';

type CalendarDay = { date: string; level: number; detail: string };
const attributes = [['Сила', 68, Zap], ['Выносливость', 54, Activity], ['Гибкость', 41, Shield], ['Восстановление', 76, Moon]] as const;

export default function ProfilePage({ onOpenSidebar: _onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<{ weight: number | null; target_weight: number | null; goal: string; equipment: string[]; } | null>(null);
  const [workouts, setWorkouts] = useState<CalendarDay[]>([]);
  const [meals, setMeals] = useState<CalendarDay[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      try {
        const [{ data: profileData, error: profileError }, { data: workoutData, error: workoutError }, { data: mealData, error: mealError }] = await Promise.all([
          supabase.from('profiles').select('full_name, weight, target_weight, goal, equipment').eq('id', user.id).maybeSingle(),
          supabase.from('workout_logs').select('log_date, exercise_name, sets').eq('user_id', user.id).gte('log_date', from),
          supabase.from('meals').select('date, calories').eq('user_id', user.id).gte('date', from),
        ]);
        if (profileError) throw profileError;
        if (workoutError) throw workoutError;
        if (mealError) throw mealError;
        setName(profileData?.full_name || user.email?.split('@')[0] || 'Атлет');
        setProfile(profileData);
        const workoutMap = new Map<string, number>();
        workoutData?.forEach((item) => workoutMap.set(item.log_date, (workoutMap.get(item.log_date) ?? 0) + 1));
        setWorkouts([...workoutMap].map(([date, count]) => ({ date, level: 1, detail: `${count} записей тренировки` })));
        const mealMap = new Map<string, number>();
        mealData?.forEach((item) => mealMap.set(item.date, (mealMap.get(item.date) ?? 0) + Number(item.calories || 0)));
        setMeals([...mealMap].map(([date, calories]) => ({ date, level: calories > 2400 ? 3 : calories < 1200 ? 1 : 0, detail: `${calories} ккал` })));
      } catch (error) {
        console.error('Profile load error', error);
        toast.error('Не удалось загрузить часть профиля');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-text-secondary">Загрузка профиля...</div>;
  const water = profile?.weight ? Math.round(profile.weight * 35) : 2000;
  return <div className="mx-auto max-w-6xl space-y-6 p-4 animate-fade-in">
    <header className="card-modern flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-accent-blue">Ascend profile</p><h1 className="text-3xl font-bold text-text">{name}</h1><p className="mt-1 text-sm text-text-secondary">{user?.email}</p></div><div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-blue/15 text-2xl font-bold text-accent-blue">{name[0]?.toUpperCase()}</div></header>
    <div className="grid gap-4 sm:grid-cols-3"><div className="card-modern"><p className="text-xs text-text-tertiary">Цель</p><p className="mt-1 font-semibold text-text">{profile?.goal || 'Поддержание'}</p></div><div className="card-modern"><p className="text-xs text-text-tertiary">Норма воды</p><p className="mt-1 font-semibold text-text">{water} мл / день</p></div><div className="card-modern"><p className="text-xs text-text-tertiary">Серия</p><p className="mt-1 font-semibold text-accent-orange">7 дней</p></div></div>
    <section className="card-modern"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-text">Атрибуты персонажа</h2><span className="text-sm text-accent-gold">Уровень 7</span></div><div className="grid gap-4 sm:grid-cols-2">{attributes.map(([label, value, Icon]) => <div key={label}><div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-text-secondary"><Icon size={15} />{label}</span><span className="text-text">{value}%</span></div><div className="h-2 rounded-full bg-bg-tertiary"><div className="h-full rounded-full bg-accent-blue" style={{ width: `${value}%` }} /></div></div>)}</div></section>
    <MuscleHeatmap />
    <div className="grid gap-6 lg:grid-cols-2"><GitHubCalendar title="Календарь тренировок" days={workouts} /><GitHubCalendar title="Календарь питания" days={meals} mode="nutrition" /></div>
    <SkillTree />
  </div>;
}
