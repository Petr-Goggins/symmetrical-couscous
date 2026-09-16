import { useEffect, useMemo, useState } from 'react';
import { Activity, Dumbbell, Flame, HeartPulse, Moon, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import MuscleHeatmap from '@/components/MuscleHeatmap';
import GitHubCalendar from '@/components/GitHubCalendar';
import SkillTree from '@/components/SkillTree';

type Workout = { exercise_name: string; weight: number; reps: number; sets: number; log_date: string };
type Sleep = { hours: number; log_date: string };
type CalendarDay = { date: string; level: number; detail: string };

function streak(dates: string[]) { const unique = [...new Set(dates)].sort().reverse(); let total = 0; let previous: Date | null = null; for (const value of unique) { const date = new Date(`${value}T00:00:00`); if (previous && Math.round((previous.getTime() - date.getTime()) / 86400000) !== 1) break; total += 1; previous = date; } return total; }
function metric(value: number, suffix = '') { return value ? `${value}${suffix}` : '—'; }

export default function ProfilePage({ onOpenSidebar: _onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ weight: number | null; target_weight: number | null; goal: string; } | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sleeps, setSleeps] = useState<Sleep[]>([]);
  const [meals, setMeals] = useState<CalendarDay[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      try {
        const [{ data: profileData, error: profileError }, { data: workoutData, error: workoutError }, { data: sleepData, error: sleepError }, { data: mealData, error: mealError }] = await Promise.all([
          supabase.from('profiles').select('weight, target_weight, goal').eq('id', user.id).maybeSingle(),
          supabase.from('workout_logs').select('log_date, exercise_name, sets, reps, weight').eq('user_id', user.id).gte('log_date', from),
          supabase.from('sleep_logs').select('log_date, hours').eq('user_id', user.id).gte('log_date', new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)),
          supabase.from('nutrition_logs').select('log_date, calories').eq('user_id', user.id).gte('log_date', from),
        ]);
        if (profileError) throw profileError;
        if (workoutError) throw workoutError;
        if (sleepError) throw sleepError;
        if (mealError) throw mealError;
        setProfile(profileData);
        setWorkouts((workoutData ?? []) as Workout[]);
        setSleeps((sleepData ?? []) as Sleep[]);
        const mealMap = new Map<string, number>();
        mealData?.forEach((item) => mealMap.set(item.log_date, (mealMap.get(item.log_date) ?? 0) + Number(item.calories || 0)));
        setMeals([...mealMap].map(([date, calories]) => ({ date, level: calories > 2400 ? 3 : calories < 1200 ? 1 : 0, detail: `${calories} ккал` })));
      } catch (error) { console.error('Profile load error', error); toast.error('Не удалось загрузить часть профиля'); } finally { setLoading(false); }
    };
    void load();
  }, [user]);

  const metrics = useMemo(() => {
    const weekStart = Date.now() - 6 * 86400000;
    const weekWorkouts = workouts.filter((item) => new Date(item.log_date).getTime() >= weekStart);
    const strength = workouts.filter((item) => /присед|жим|тяга/.test(item.exercise_name.toLowerCase())).reduce((max, item) => Math.max(max, Number(item.weight || 0) * (1 + Number(item.reps || 0) / 30)), 0);
    const endurance = weekWorkouts.filter((item) => /бег|кардио|вел|скакал/.test(item.exercise_name.toLowerCase())).length;
    const flexibility = weekWorkouts.filter((item) => /растяж|стретч|йог/.test(item.exercise_name.toLowerCase())).length;
    const recovery = sleeps.length ? sleeps.reduce((sum, item) => sum + Number(item.hours || 0), 0) / sleeps.length : 0;
    return { strength: strength ? `${Math.round(strength)} кг 1ПМ` : '—', endurance: metric(endurance, ' трен.'), flexibility: metric(flexibility, ' трен.'), recovery: recovery ? `${recovery.toFixed(1)} ч` : '—', streak: streak(workouts.map((item) => item.log_date)) };
  }, [sleeps, workouts]);

  if (loading) return <div className="p-6 text-text-secondary">Загрузка профиля...</div>;
  return <div className="mx-auto max-w-6xl space-y-6 p-4 animate-fade-in"><header className="card-modern flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-accent-blue">Ascend profile</p><h1 className="text-3xl font-bold text-text">{user?.email?.split('@')[0] || 'Атлет'}</h1><p className="mt-1 text-sm text-text-secondary">{user?.email}</p></div><div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-blue/15 text-2xl font-bold text-accent-blue">{user?.email?.[0]?.toUpperCase()}</div></header><div className="grid gap-4 sm:grid-cols-3"><div className="card-modern"><p className="text-xs text-text-tertiary">Цель</p><p className="mt-1 font-semibold text-text">{profile?.goal || '—'}</p></div><div className="card-modern"><p className="text-xs text-text-tertiary">Тренировки за 30 дней</p><p className="mt-1 font-semibold text-text">{workouts.length || '—'}</p></div><div className="card-modern"><p className="text-xs text-text-tertiary">Серия тренировок</p><p className="mt-1 flex items-center gap-2 font-semibold text-text"><Flame size={16} className="text-accent-orange" />{metrics.streak ? `${metrics.streak} дней` : '—'}</p></div></div><section className="card-modern"><div className="mb-4 flex items-center gap-2"><Target size={18} className="text-accent-blue" /><h2 className="text-xl font-bold text-text">Реальные метрики</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[Dumbbell, 'Сила', metrics.strength], [Activity, 'Выносливость', metrics.endurance], [HeartPulse, 'Гибкость', metrics.flexibility], [Moon, 'Восстановление', metrics.recovery]].map(([Icon, label, value]) => <div key={label as string} className="rounded-lg border border-border bg-bg/40 p-4"><Icon size={18} className="mb-3 text-accent-blue" /><p className="text-xs text-text-tertiary">{label}</p><p className="mt-1 font-semibold text-text">{value}</p></div>)}</div></section><MuscleHeatmap /><section className="card-modern"><div className="grid gap-4 lg:grid-cols-2"><GitHubCalendar title="Календарь тренировок" days={workouts.map((item) => ({ date: item.log_date, level: 1, detail: `${item.exercise_name}: ${item.sets} подхода` }))} /><GitHubCalendar title="Календарь питания" days={meals} mode="nutrition" /></div></section><SkillTree /></div>;
}
