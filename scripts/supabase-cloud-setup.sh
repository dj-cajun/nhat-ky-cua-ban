#!/usr/bin/env bash
# Supabase Cloud + Vercel 환경 변수 일괄 설정
# 사전: supabase login (또는 SUPABASE_ACCESS_TOKEN 환경 변수)
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_NAME="${SUPABASE_PROJECT_NAME:-nhat-ky-cua-ban}"
REGION="${SUPABASE_REGION:-ap-southeast-1}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if ! supabase projects list >/dev/null 2>&1; then
  echo "❌ Supabase 로그인 필요:"
  echo "   supabase login"
  echo "   또는: export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

# 기존 link 확인
if [[ -f supabase/.temp/project-ref ]]; then
  REF=$(cat supabase/.temp/project-ref)
  echo "▶ 기존 연결 프로젝트: $REF"
else
  echo "▶ 새 Supabase 프로젝트 생성: $PROJECT_NAME ($REGION)"
  if [[ -z "$DB_PASSWORD" ]]; then
    DB_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
    echo "   (DB 비밀번호 자동 생성 — Dashboard에서 확인 가능)"
  fi
  CREATE_OUT=$(supabase projects create "$PROJECT_NAME" --region "$REGION" --db-password "$DB_PASSWORD" --org-id "$(supabase orgs list -o json | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')" 2>&1) || {
    echo "$CREATE_OUT"
    echo ""
    echo "프로젝트가 이미 있으면:"
    echo "  supabase link --project-ref <PROJECT_REF>"
    exit 1
  }
  REF=$(echo "$CREATE_OUT" | grep -oE '[a-z]{20}' | head -1 || true)
  if [[ -z "$REF" ]]; then
    echo "$CREATE_OUT"
    echo "생성 후: supabase link --project-ref <ref>"
    exit 1
  fi
  supabase link --project-ref "$REF"
fi

echo "▶ 마이그레이션 push..."
supabase db push

echo "▶ 시드 데이터 (schools)..."
supabase db execute -f supabase/seed.sql 2>/dev/null || {
  echo "   seed.sql은 Dashboard SQL Editor에서 실행하거나:"
  echo "   psql \"\$(supabase db url)\" -f supabase/seed.sql"
}

REF=$(cat supabase/.temp/project-ref 2>/dev/null || supabase projects list -o json | python3 -c "import json,sys; ps=json.load(sys.stdin); print(next(p['id'] for p in ps if '$PROJECT_NAME' in p.get('name','')))")
API_URL="https://${REF}.supabase.co"

echo ""
echo "▶ API 키 조회..."
KEYS=$(supabase projects api-keys --project-ref "$REF" -o json)
ANON=$(echo "$KEYS" | python3 -c "import json,sys; ks=json.load(sys.stdin); print(next(k['api_key'] for k in ks if k.get('name')=='anon'))")

PEPPER="${VITE_HINT_PEPPER:-}"
if [[ -z "$PEPPER" ]]; then
  PEPPER=$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 64)
fi

echo ""
echo "══════════════════════════════════════"
echo "Vercel 환경 변수 (복사 또는 아래 명령 실행):"
echo "══════════════════════════════════════"
echo "VITE_SUPABASE_ENABLED=true"
echo "VITE_SUPABASE_URL=$API_URL"
echo "VITE_SUPABASE_ANON_KEY=$ANON"
echo "VITE_DEMO_MODE=false"
echo "VITE_HINT_PEPPER=$PEPPER"
echo ""

if command -v npx >/dev/null && npx vercel whoami >/dev/null 2>&1; then
  read -r -p "Vercel에 환경 변수를 설정할까요? [y/N] " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    for pair in \
      "VITE_SUPABASE_ENABLED true" \
      "VITE_SUPABASE_URL $API_URL" \
      "VITE_SUPABASE_ANON_KEY $ANON" \
      "VITE_DEMO_MODE false" \
      "VITE_HINT_PEPPER $PEPPER"; do
      set -- $pair
      echo "$2" | npx vercel env add "$1" production preview development --force 2>/dev/null || \
        echo "$2" | npx vercel env add "$1" production --force
    done
    echo "✅ Vercel env 설정 완료. 재배포: npx vercel --prod"
  fi
fi

echo ""
echo "Studio: https://supabase.com/dashboard/project/$REF"
echo "완료."
