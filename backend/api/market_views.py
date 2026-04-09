"""
Market data proxy: USD/UZS exchange rate + LME Aluminum price.

Sources:
  - USD/UZS: Central Bank of Uzbekistan  https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/
  - Aluminum: dzengi.com (Aluminium Spot)  https://api-adapter.dzengi.com/api/v1/ticker/24hr
    No API key required. Returns lastPrice in USD/metric ton.
"""
import json
import urllib.request
from datetime import date

from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class MarketDataView(APIView):
    """
    GET /api/market/data/
    Returns today's USD/UZS rate and LME aluminum price.
    Cached for 1 hour.
    """
    permission_classes = [IsAuthenticated]
    CACHE_TTL = 3600  # 1 hour

    def get(self, request):
        cache_key = f'market_data_{date.today().isoformat()}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        result: dict = {}

        # ── 1. USD/UZS from Central Bank of Uzbekistan ───────────────────────
        try:
            req = urllib.request.Request(
                'https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/',
                headers={'User-Agent': 'Mozilla/5.0'},
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode())
            result['usd_uzs'] = float(data[0]['Rate'])
            result['usd_date'] = data[0]['Date']
        except Exception as exc:
            result['usd_uzs'] = None
            result['usd_error'] = str(exc)

        # ── 2. Aluminium Spot from dzengi.com (no API key required) ─────────
        try:
            req = urllib.request.Request(
                'https://api-adapter.dzengi.com/api/v1/ticker/24hr?symbol=Aluminum',
                headers={'User-Agent': 'Mozilla/5.0'},
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode())
            price = data.get('highPrice') or data.get('lastPrice') or data.get('prevClosePrice')
            result['aluminum_price'] = round(float(price), 2) if price else None
            result['aluminum_unit'] = 'USD/т'
        except Exception as exc:
            result['aluminum_price'] = None
            result['aluminum_error'] = str(exc)

        cache.set(cache_key, result, self.CACHE_TTL)
        return Response(result)
