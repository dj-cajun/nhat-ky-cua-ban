#!/usr/bin/env bash
# 로컬 Supabase 시작 + 연결 정보 출력
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Supabase 로컬 시작..."
supabase start

echo ""
echo "▶ 연결 정보 (.env 참고):"
supabase status

echo ""
echo "Studio: http://127.0.0.1:54323"
echo "API:    http://127.0.0.1:54321"
echo ""
echo "앱 실행: VITE_SUPABASE_ENABLED=true npm run dev"
