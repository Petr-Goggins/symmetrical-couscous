import { useEffect, useMemo, useState } from 'react';
import { Activity, Dumbbell, Moon, Pause, Play, UserRound, Droplet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { supabase } from '@/lib/supabase';

type IslandState = 'onboarding' | 'sleep' | 'cycle' | 'workout' | 'paused' | 'ok';
type WorkoutSession = { startedAt: number; pausedAt: number | null; pausedMs: number };

const WORKOUT_STORAGE_KEY = 'ascend-workout-session';
const legacyWorkoutKey = 'ascend-workout-start';

const stateText: Record<Exclude<IslandState, 'workout' | 'paused'>, string> = {
  onboarding: 'Заполните анкету →',
  sleep: 'Запишите сон',
  cycle: 'Сегодня',
  ok: 'Сегодня всё по плану',
};

const glassStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
  width: 200,
  minWidth: 200,
  height: 40,
  maxWidth: 'calc(100% - 32px)',
  padding: '0 16px',
  borderRadius: 32,
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
};

export default function DynamicIsland() {
  const user = useAuthStore((state) => state.user);
  const { profile, loading: profileLoading } = useProfileStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sleepRecorded, setSleepRecorded] = useState(false);
  const [calories, setCalories] = useState(0);
  const [cyclePhase, setCyclePhase] = useState('');
  const [session, setSession] = useState<WorkoutSession | null>(() => readSession());
  const [now, setNow] = useState(Date.now());
  const [typedText, setTypedText] = useState('');

  const islandState: IslandState = useMemo(() => {
    if (!profile) return 'onboarding';
    if (session?.pausedAt) return 'paused';
    if (session) return 'workout';
    if (!sleepRecorded) return 'sleep';
    if (profile.gender === 'female' && cyclePhase) return 'cycle';
    return 'ok';
  }, [cyclePhase, profile, session, sleepRecorded]);

  const staticText = islandState === 'workout'
    ? 'Тренировка:'
    : islandState === 'paused'
      ? 'Пауза'
      : islandState === 'cycle'
        ? `Сегодня ${cyclePhase}`
        : stateText[islandState];

  useEffect(() => {
    if (!user || profileLoading || !profile) return;
    let cancelled = false;
    const loadStatus = async () => {
      const today = new Date().toISOString().slice(0, 10);
      try {
        const { data, error } = await supabase
          .from('sleep_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .maybeSingle();
        if (!error && !cancelled) setSleepRecorded(Boolean(data));
      } catch (error) {
        console.error('DynamicIsland sleep status error', error);
      }
      try {
        const { data, error } = await supabase
          .from('nutrition_logs')
          .select('calories')
          .eq('user_id', user.id)
          .eq('log_date', today);
        if (!error && !cancelled) setCalories(data?.reduce((sum, item) => sum + Number(item.calories || 0), 0) || 0);
      } catch (error) {
        console.error('DynamicIsland calories status error', error);
      }
      if (profile.gender === 'female' && profile.cycle_last_period) {
        const length = profile.cycle_length || 28;
        const day = Math.max(0, Math.floor((Date.now() - new Date(profile.cycle_last_period).getTime()) / 86400000) % length);
        const phase = day < 5 ? 'Менструация' : day < 14 ? 'Фолликулярная' : day < 17 ? 'Овуляторная' : 'Лютеиновая';
        if (!cancelled) setCyclePhase(phase);
      }
    };
    void loadStatus();
    const refresh = window.setInterval(() => void loadStatus(), 60000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, [profile, profileLoading, user]);

  useEffect(() => {
    const refreshSession = () => { setSession(readSession()); setNow(Date.now()); };
    window.addEventListener('storage', refreshSession);
    const timer = window.setInterval(refreshSession, 1000);
    return () => { window.removeEventListener('storage', refreshSession); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    setTypedText('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(staticText.slice(0, index));
      if (index >= staticText.length) window.clearInterval(timer);
    }, 120);
    return () => window.clearInterval(timer);
  }, [islandState, staticText]);

  if (!user || profileLoading) return null;
  const elapsed = session ? formatElapsed(getElapsedMs(session, now)) : '';
  const text = islandState === 'workout' ? `${typedText} ${elapsed}` : islandState === 'ok' ? `${typedText} · ${calories} ккал` : typedText;
  const icon = islandState === 'onboarding' ? <UserRound size={16} /> : islandState === 'sleep' ? <Moon size={16} /> : islandState === 'cycle' ? <Droplet size={16} /> : islandState === 'workout' || islandState === 'paused' ? <Dumbbell size={16} /> : <Activity size={16} />;
  const goTo = islandState === 'onboarding' ? '/coach' : islandState === 'sleep' ? '/sleep' : islandState === 'workout' || islandState === 'paused' ? '/workouts' : islandState === 'cycle' ? '/cycle' : '/dashboard';

  const togglePause = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!session) return;
    const updated = session.pausedAt
      ? { ...session, pausedAt: null, pausedMs: session.pausedMs + (Date.now() - session.pausedAt) }
      : { ...session, pausedAt: Date.now() };
    writeSession(updated);
    setSession(updated);
  };

  return <div
    role="status"
    aria-live="polite"
    onClick={() => navigate(goTo)}
    style={{ ...glassStyle, width: text.length > 25 ? 320 : 200 }}
    className="flex cursor-pointer items-center justify-center gap-2 text-sm text-text transition-[width] duration-300 hover:bg-white/[0.08]"
  >
    <span className={islandState === 'workout' ? 'text-accent-orange' : 'text-accent-blue'}>{icon}</span>
    <span className="min-w-0 truncate">{text}</span>
    {(islandState === 'workout' || islandState === 'paused') && <button type="button" onClick={togglePause} aria-label={islandState === 'paused' ? 'Продолжить тренировку' : 'Поставить тренировку на паузу'} className="shrink-0 rounded-full p-1 text-text-secondary hover:bg-white/10 hover:text-text">{islandState === 'paused' ? <Play size={14} /> : <Pause size={14} />}</button>}
  </div>;
}

function readSession(): WorkoutSession | null {
  try {
    const stored = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as WorkoutSession;
    const legacy = localStorage.getItem(legacyWorkoutKey);
    return legacy ? { startedAt: Number(legacy), pausedAt: null, pausedMs: 0 } : null;
  } catch {
    return null;
  }
}

function writeSession(session: WorkoutSession | null) {
  if (session) localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(WORKOUT_STORAGE_KEY);
}

function getElapsedMs(session: WorkoutSession, now: number) {
  const end = session.pausedAt ?? now;
  return Math.max(0, end - session.startedAt - session.pausedMs);
}

function formatElapsed(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
