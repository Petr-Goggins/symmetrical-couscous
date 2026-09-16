import { useEffect, useMemo, useState } from 'react';
import { Activity, Award, Droplet, Flame, Lock, Medal, Moon, Trophy, Dumbbell } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

type Workout = { exercise_name: string; weight: number; log_date: string };
type Achievement = { id: string; title: string; description: string; icon: typeof Award; unlocked: boolean };

function calculateStreak(dates: string[]) {
  const unique = [...new Set(dates)].sort().reverse();
  let streak = 0;
  let previous: Date | null = null;
  for (const value of unique) {
    const date = new Date(`${value}T00:00:00`);
    if (previous && Math.round((previous.getTime() - date.getTime()) / 86400000) !== 1) break;
    streak += 1;
    previous = date;
  }
  return streak;
}

export default function AchievementsPage({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sleepDays, setSleepDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [workoutResult, sleepResult] = await Promise.all([
          supabase.from('workout_logs').select('exercise_name, weight, log_date').eq('user_id', user.id).order('log_date', { ascending: true }),
          supabase.from('sleep_logs').select('log_date, hours').eq('user_id', user.id).gte('log_date', new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10)),
        ]);
        if (workoutResult.error) throw workoutResult.error;
        if (sleepResult.error) throw sleepResult.error;
        setWorkouts((workoutResult.data ?? []) as Workout[]);
        setSleepDays(new Set((sleepResult.data ?? []).filter((item) => Number(item.hours) >= 8).map((item) => item.log_date)).size);
      } catch (error) {
        console.error('Achievements load error', error);
      } finally { setLoading(false); }
    };
    void load();
  }, [user]);

  const achievements = useMemo<Achievement[]>(() => {
    const streak = calculateStreak(workouts.map((item) => item.log_date));
    const squats = workouts.filter((item) => item.exercise_name.toLowerCase().includes('присед')).map((item) => Number(item.weight) || 0);
    const hasSquatProgress = squats.length > 1 && Math.max(...squats) - Math.min(...squats) >= 5;
    const cardio = workouts.filter((item) => /бег|кардио|вел|скакал/.test(item.exercise_name.toLowerCase())).length;
    const stretching = workouts.filter((item) => /растяж|стретч|йог/.test(item.exercise_name.toLowerCase())).length;
    return [
      { id: 'first', title: 'Первая тренировка', description: 'Добавьте запись в workout_logs', icon: Dumbbell, unlocked: workouts.length > 0 },
      { id: 'streak', title: '5 дней подряд', description: `Текущая серия: ${streak} дн.`, icon: Flame, unlocked: streak >= 5 },
      { id: 'thirty', title: '30 тренировок', description: `Записей: ${workouts.length}`, icon: Trophy, unlocked: workouts.length >= 30 },
      { id: 'squat', title: '+5 кг к приседу', description: 'Нужна динамика веса в приседаниях', icon: Medal, unlocked: hasSquatProgress },
      { id: 'cardio', title: 'Кардио-ритм', description: `Кардио-тренировок: ${cardio}`, icon: Activity, unlocked: cardio >= 10 },
      { id: 'stretch', title: 'Гибкость', description: `Тренировок на растяжку: ${stretching}`, icon: Award, unlocked: stretching >= 5 },
      { id: 'sleep', title: 'Восстановление', description: `Дней сна 8+: ${sleepDays}`, icon: Moon, unlocked: sleepDays >= 14 },
      { id: 'hundred', title: '100 тренировок', description: `Записей: ${workouts.length}`, icon: Trophy, unlocked: workouts.length >= 100 },
      { id: 'push', title: 'Сила Push', description: 'Закройте первый навык Push', icon: Dumbbell, unlocked: workouts.some((item) => /жим|отжим/.test(item.exercise_name.toLowerCase())) },
      { id: 'pull', title: 'Сила Pull', description: 'Закройте первый навык Pull', icon: Dumbbell, unlocked: workouts.some((item) => /тяга|подтяг/.test(item.exercise_name.toLowerCase())) },
      { id: 'legs', title: 'Сильные ноги', description: 'Запишите присед или выпады', icon: Dumbbell, unlocked: workouts.some((item) => /присед|выпад/.test(item.exercise_name.toLowerCase())) },
      { id: 'core', title: 'Крепкий корпус', description: 'Запишите планку или пресс', icon: Activity, unlocked: workouts.some((item) => /планк|пресс/.test(item.exercise_name.toLowerCase())) },
      { id: 'active', title: 'Активная неделя', description: 'Три записи тренировок', icon: Flame, unlocked: new Set(workouts.slice(-7).map((item) => item.log_date)).size >= 3 },
      { id: 'discipline', title: 'Дисциплина', description: '10 записей тренировок', icon: Award, unlocked: workouts.length >= 10 },
    ];
  }, [sleepDays, workouts]);

  const unlocked = achievements.filter((item) => item.unlocked).length;
  return <div><TopBar title="Достижения" onOpenSidebar={onOpenSidebar} /><main className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8 animate-slide-up"><header className="card-modern flex items-center justify-between"><div><h2 className="text-xl font-bold text-text">Реальный прогресс</h2><p className="mt-1 text-sm text-text-secondary">{loading ? 'Загрузка данных...' : unlocked ? `${unlocked} из ${achievements.length} открыто` : 'Начните первую тренировку, чтобы открыть достижения'}</p></div><div className="text-right"><p className="text-3xl font-bold text-accent-blue">{unlocked} / {achievements.length}</p><p className="text-xs text-text-tertiary">без фиктивных значений</p></div></header><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{achievements.map((achievement) => { const Icon = achievement.unlocked ? achievement.icon : Lock; return <article key={achievement.id} className={`card p-5 ${achievement.unlocked ? 'border-accent-green/40' : 'opacity-60'}`}><div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${achievement.unlocked ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-tertiary text-text-tertiary'}`}><Icon size={24} /></div><h3 className="font-bold text-text">{achievement.title}</h3><p className="mt-1 text-xs text-text-secondary">{achievement.description}</p></article>; })}</div></main></div>;
}
