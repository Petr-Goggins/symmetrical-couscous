"""OpenRouter AI service with RAG context injection."""

from __future__ import annotations

import logging
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

from rag_service import search_knowledge

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
SITE_URL = os.getenv("SITE_URL", "http://localhost:8000")
SITE_TITLE = os.getenv("SITE_TITLE", "Sync App")

MODEL = "meta-llama/llama-3.3-70b-instruct:free"
DISCLAIMER = "ИИ не является врачом. Проконсультируйтесь со специалистом"
REQUEST_TIMEOUT = 60.0


def _build_system_prompt(user_data: dict, context_chunks: list[str]) -> str:
    fields = {
        "gender": user_data.get("gender", "не указан"),
        "age": user_data.get("age", "не указан"),
        "height": user_data.get("height", "не указан"),
        "weight": user_data.get("weight", "не указан"),
        "goal": user_data.get("goal", "не указана"),
        "activity": user_data.get("activity", "не указана"),
        "skills": user_data.get("skills", "не указаны"),
        "cyclePhase": user_data.get("cyclePhase", "не указана"),
        "religion": user_data.get("religion", "не указана"),
        "inventory": user_data.get("inventory", "не указан"),
    }

    profile_lines = "\n".join(f"- {key}: {value}" for key, value in fields.items())

    context_block = ""
    if context_chunks:
        joined = "\n\n---\n\n".join(context_chunks)
        context_block = f"\n\nРелевантная информация из базы знаний:\n{joined}"

    return (
         f"""
Ты — персональный фитнес-наставник в приложении Sync. Твоя задача — давать **конкретные, практичные советы** по питанию и тренировкам на основе данных пользователя.

Данные пользователя:
{profile_lines}

Дополнительный контекст (если есть):
{context_block}

Твои жёсткие правила:
1. **Никаких общих фраз**. Никаких «важно помнить», «стоит отметить», «возможно», «может быть». Только чёткие рекомендации.
2. **Учитывай все данные** из профиля: цель, вес, рост, возраст, уровень активности, инвентарь.
3. Если есть фаза цикла — адаптируй тренировки и питание под неё (в менструальную — снижай интенсивность, в лютеиновую — добавляй углеводы и магний).
4. Если есть религиозные ограничения — исключай запрещённые продукты.
5. Если указан инвентарь — предлагай упражнения только с этим оборудованием.
6. Отвечай **коротко и по делу** (2–4 абзаца максимум). Без воды.
7. Если не знаешь точного ответа — честно скажи, что не знаешь, и предложи обратиться к врачу.
8. Всегда добавляй дисклеймер: {DISCLAIMER}
""")


def _ensure_disclaimer(reply: str) -> str:
    if DISCLAIMER.lower() in reply.lower():
        return reply
    return f"{reply.rstrip()}\n\n{DISCLAIMER}"


async def ask_ai(user_message: str, user_data: dict) -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY не задан в .env")

    context_chunks = search_knowledge(user_message)
    system_prompt = _build_system_prompt(user_data, context_chunks)

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_TITLE,
    }

    payload = {
        "model": MODEL, 
        "messages": messages,
        "temperature": 0.3,  
        "max_tokens": 500    
    } }

    url = f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 429:
                logger.warning("OpenRouter rate limit (429)")
                raise RuntimeError(
                    "Превышен лимит запросов OpenRouter. Попробуйте позже."
                )

            response.raise_for_status()
            data = response.json()

    except httpx.TimeoutException:
        logger.error("OpenRouter request timed out")
        raise RuntimeError("Превышено время ожидания ответа от ИИ. Попробуйте позже.")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "OpenRouter HTTP error %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise RuntimeError(
            f"Ошибка OpenRouter (HTTP {exc.response.status_code}). Попробуйте позже."
        )
    except httpx.RequestError as exc:
        logger.error("OpenRouter request failed: %s", exc)
        raise RuntimeError("Не удалось связаться с OpenRouter. Проверьте сеть.")

    choices = data.get("choices", [])
    if not choices:
        logger.error("OpenRouter returned empty choices: %s", data)
        raise RuntimeError("ИИ вернул пустой ответ.")

    reply = choices[0].get("message", {}).get("content", "").strip()
    if not reply:
        raise RuntimeError("ИИ вернул пустой ответ.")

    return _ensure_disclaimer(reply)
