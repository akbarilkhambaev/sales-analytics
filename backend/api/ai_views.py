import httpx
from rest_framework.views import APIView
from rest_framework.response import Response
from authentication.permissions import IsSuperAdmin

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL_NAME = "qwen2.5:3b"

SYSTEM_PROMPT = """Ты — умный ИИ-помощник системы аналитики продаж AKFA SALES VISION.
Твоя задача — помогать сотрудникам анализировать данные о продажах, клиентах, KPI и отчётах.
Отвечай ТОЛЬКО на вопросы, связанные с продажами, аналитикой, работой системы и бизнесом компании AKFA.
Отвечай на русском языке. Будь кратким, конкретным и профессиональным.
Если вопрос не связан с работой или системой — вежливо откажись отвечать."""


class AIChatView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])

        if not message:
            return Response({'error': 'Сообщение не может быть пустым'}, status=400)

        if len(message) > 4000:
            return Response({'error': 'Сообщение слишком длинное (макс. 4000 символов)'}, status=400)

        # Keep last 10 history messages to limit context size
        trimmed_history = history[-10:] if len(history) > 10 else history

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *trimmed_history,
            {"role": "user", "content": message},
        ]

        try:
            resp = httpx.post(
                OLLAMA_URL,
                json={"model": MODEL_NAME, "messages": messages, "stream": False},
                timeout=120.0,
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["message"]["content"]
            return Response({"reply": reply})
        except httpx.ConnectError:
            return Response(
                {"error": "Сервис AI недоступен. Убедитесь, что Ollama запущен."},
                status=503,
            )
        except httpx.TimeoutException:
            return Response(
                {"error": "Превышено время ожидания ответа от AI. Попробуйте ещё раз."},
                status=504,
            )
        except Exception as e:
            return Response({"error": f"Ошибка AI: {str(e)}"}, status=500)
