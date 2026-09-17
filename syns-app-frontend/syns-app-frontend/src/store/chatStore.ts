import { create } from 'zustand';
import type { ChatMessage, ChatRole, Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { usePlanStore } from '@/store/planStore';
import { useCoachStore } from '@/store/coachStore';
import { calculateCyclePhase, getPhaseRecommendation } from '@/lib/cycle';

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  fetchMessages: (userId: string) => Promise<void>;
  sendMessage: (userId: string, profile: Profile | null, content: string) => Promise<void>;
  clearMessages: (userId: string) => Promise<void>;
  reset: () => void;
}

const SUGGESTED_REPLIES: Record<string, string[]> = {
  workout: [
    'Для начала определите цель: сила или выносливость. Новичкам рекомендую 3 тренировки в неделю — понедельник, среда, пятница. Каждая сессия 45–60 минут. Начните с базовых движений: приседания, отжимания, подтягивания.',
    'Хороший план на неделю: 2 силовые + 1 кардио. Не забывайте про отдых — мышцы растут во время восстановления.',
  ],
  nutrition: [
    'Старайтесь сбалансировать тарелку: половина — овощи, четверть — белок, четверть — сложные углеводы. Пейте воду за 20 минут до еды.',
    'Ешьте каждые 3–4 часа, не пропускайте завтрак. Белок в каждом приёме пищи ускоряет метаболизм.',
  ],
  sleep: [
    'Старайтесь ложиться в одно и то же время, за час до сна уберите экраны. Темнота и прохлада (18–20°C) — идеальные условия.',
    'Если не удаётся уснуть 20 минут — встаньте, почитайте книгу при тусклом свете, потом вернитесь в кровать.',
  ],
  water: [
    'Норма воды — 30 мл на кг веса. Распределите на весь день, не пейте много за раз.',
    'Стакан воды утром натощак запускает обмен веществ. Держите бутылку рядом как напоминание.',
  ],
  motivation: [
    'Дисциплина важнее мотивации. Мотивация приходит и уходит, а привычка остаётся. Начните с малого — 10 минут в день.',
    'Каждая тренировка — вклад в ваше будущее «я». Через месяц вы скажете себе спасибо, что не сдались.',
  ],
  default: [
    'Я ваш ИИ-наставник Ascend. Расскажите подробнее о вашей цели — тренировки, питание, сон или мотивация?',
    'Отличный вопрос! Чтобы дать точный совет, мне нужно знать ваш уровень и оборудование. Заполните профиль, и я составлю персональный план.',
  ],
};

function pickReply(content: string): string {
  const lower = content.toLowerCase();
  if (/тренир|упражн|сил|кардио|зал|ганте/.test(lower)) {
    const r = SUGGESTED_REPLIES.workout;
    return r[Math.floor(Math.random() * r.length)];
  }
  if (/ед|питан|калор|белок|диет|обед|ужин/.test(lower)) {
    const r = SUGGESTED_REPLIES.nutrition;
    return r[Math.floor(Math.random() * r.length)];
  }
  if (/сон|спать|устал|бессонни/.test(lower)) {
    const r = SUGGESTED_REPLIES.sleep;
    return r[Math.floor(Math.random() * r.length)];
  }
  if (/вод|пить|жажда/.test(lower)) {
    const r = SUGGESTED_REPLIES.water;
    return r[Math.floor(Math.random() * r.length)];
  }
  if (/мотив|лень|не могу|брос|сда/.test(lower)) {
    const r = SUGGESTED_REPLIES.motivation;
    return r[Math.floor(Math.random() * r.length)];
  }
  const r = SUGGESTED_REPLIES.default;
  return r[Math.floor(Math.random() * r.length)];
}

function buildContext(profile: Profile | null): string {
  if (!profile) return 'Профиль не заполнен.';
  const parts: string[] = [];
  if (profile.gender && profile.gender !== 'not_specified') parts.push(`Пол: ${profile.gender}`);
  if (profile.age) parts.push(`Возраст: ${profile.age}`);
  if (profile.height) parts.push(`Рост: ${profile.height} см`);
  if (profile.weight) parts.push(`Вес: ${profile.weight} кг`);
  if (profile.goal) parts.push(`Цель: ${profile.goal}`);
  if (profile.activity_level) parts.push(`Активность: ${profile.activity_level}`);
  if (profile.training_level) parts.push(`Уровень: ${profile.training_level}`);
  if (profile.days_per_week) parts.push(`Дней/нед: ${profile.days_per_week}`);
  if (profile.weak_muscles.length) parts.push(`Отстающие: ${profile.weak_muscles.join(', ')}`);
  if (profile.equipment.length) parts.push(`Оборудование: ${profile.equipment.join(', ')}`);
  if (profile.fasting.length) parts.push(`Пост: ${profile.fasting.join(', ')}`);
  if (profile.diet.length) parts.push(`Диета: ${profile.diet.join(', ')}`);
  // Cycle phase
  if (profile.gender === 'female' && profile.cycle_last_period) {
    const cycleInfo = calculateCyclePhase(profile.cycle_last_period, profile.cycle_length);
    const rec = getPhaseRecommendation(cycleInfo.phase);
    parts.push(`Фаза цикла: ${rec.label} (день ${cycleInfo.dayOfCycle})`);
  }
  // Coach data
  const coach = useCoachStore.getState().coachData;
  if (coach) {
    if (coach.focus_type) parts.push(`Фокус: ${coach.focus_type}`);
    if (coach.injuries.length) parts.push(`Травмы: ${coach.injuries.join(', ')}`);
    if (coach.priority) parts.push(`Приоритет: ${coach.priority}`);
    if (coach.sleep_hours) parts.push(`Сон: ${coach.sleep_hours}`);
    if (coach.stress_level) parts.push(`Стресс: ${coach.stress_level}`);
  }
  // Current plan summary
  const plan = usePlanStore.getState().plan;
  if (plan) {
    parts.push(`План: ${plan.name}, ${plan.days_per_week} дн/нед, цель: ${plan.goal}`);
  }
  return parts.length ? parts.join('; ') : 'Профиль пуст.';
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  fetchMessages: async (userId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      set({ error: error.message });
      return;
    }
    set({ messages: data ?? [] });
  },
  sendMessage: async (userId: string, profile: Profile | null, content: string) => {
    if (!content.trim()) return;

    // optimistic insert of user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      role: 'user' as ChatRole,
      content,
      created_at: new Date().toISOString(),
    };
    set({ messages: [...get().messages, tempUserMsg], loading: true, error: null });

    const context = buildContext(profile);
    let savedUser: ChatMessage | null = null;
    try {
      const result = await supabase.from('chat_messages').insert({ user_id: userId, role: 'user', content }).select().single();
      if (!result.error) savedUser = result.data as ChatMessage;
    } catch (error) {
      console.warn('Chat history user message was not saved', error);
    }
    if (savedUser) set({ messages: get().messages.map((m) => (m.id === tempUserMsg.id ? savedUser! : m)) });

    let reply: string;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, user_data: { context, ...(profile ?? {}) } }),
      });
      if (!response.ok) throw new Error(`AI API: ${response.status}`);
      const data = await response.json() as { reply?: string };
      reply = data.reply?.trim() || 'ИИ не вернул ответ. Попробуйте ещё раз.';
    } catch (error) {
      console.error('AI request failed', error);
      reply = pickReply(content);
    }

    try {
      const result = await supabase.from('chat_messages').insert({ user_id: userId, role: 'assistant', content: reply }).select().single();
      const assistantMessage = result.data as ChatMessage | null;
      set({ messages: [...get().messages, assistantMessage ?? { id: `ai-${Date.now()}`, user_id: userId, role: 'assistant', content: reply, created_at: new Date().toISOString() }], loading: false });
    } catch (error) {
      console.warn('Chat history AI message was not saved', error);
      set({ messages: [...get().messages, { id: `ai-${Date.now()}`, user_id: userId, role: 'assistant', content: reply, created_at: new Date().toISOString() }], loading: false });
    }
  },
  clearMessages: async (userId: string) => {
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    set({ messages: [] });
  },
  reset: () => set({ messages: [], loading: false, error: null }),
}));
