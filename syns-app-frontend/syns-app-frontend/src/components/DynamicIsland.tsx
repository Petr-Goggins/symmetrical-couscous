import { useEffect, useState } from 'react';
import { Activity, Dumbbell, Moon, Pause, Play, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';

export default function DynamicIsland() {
  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.profile);
  const location = useLocation();
  const navigate = useNavigate();
  const [shown, setShown] = useState('');
  const [paused, setPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const value = localStorage.getItem('ascend-workout-start');
    return value ? Number(value) : null;
  });
  const activeWorkout = Boolean(startedAt);
  const message = !profile ? 'Заполните анкету' : activeWorkout ? (paused ? 'Пауза' : `Тренировка: ${formatElapsed(startedAt!)}`) : location.pathname === '/sleep' ? 'Запишите сон' : 'Сегодня всё по плану';
  const Icon = !profile ? UserRound : activeWorkout ? Dumbbell : location.pathname === '/sleep' ? Moon : Activity;

  useEffect(() => {
    let index = 0;
    setShown('');
    const timer = window.setInterval(() => {
      index += 1;
      setShown(message.slice(0, index));
      if (index >= message.length) window.clearInterval(timer);
    }, 120);
    return () => window.clearInterval(timer);
  }, [message]);

  useEffect(() => {
    const refresh = () => setStartedAt(Number(localStorage.getItem('ascend-workout-start')) || null);
    window.addEventListener('storage', refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => { window.removeEventListener('storage', refresh); window.clearInterval(timer); };
  }, []);

  const click = () => navigate(!profile ? '/coach' : activeWorkout ? '/workouts' : location.pathname === '/sleep' ? '/sleep' : '/dashboard');
  const togglePause = (event: React.MouseEvent) => {
    event.stopPropagation();
    setPaused((value) => !value);
  };

  if (!user) return null;
  return <button type="button" onClick={click} className="fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-[32px] border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-text shadow-lg backdrop-blur-[20px] transition hover:scale-[1.02]">
    <Icon size={16} className={activeWorkout ? 'text-accent-orange' : 'text-accent-blue'} />
    <span>{shown}</span>
    {activeWorkout && <span onClick={togglePause} className="ml-1 rounded-full p-1 text-text-secondary hover:bg-white/10" aria-label={paused ? 'Продолжить' : 'Пауза'}>{paused ? <Play size={14} /> : <Pause size={14} />}</span>}
  </button>;
}

function formatElapsed(start: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  return `${hours}:${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
