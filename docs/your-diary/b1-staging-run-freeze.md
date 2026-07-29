# B.1 Staging Run Freeze Record

> **이 파일은 실측 시작 전에 환경을 고정하는 기록이다.**  
> 테스트 중 코드/migration이 바뀌면 결과를 무효로 하고 SHA를 갱신한 뒤 처음부터 다시 한다.

## 현재 동결 (cloud agent 시점)

| 항목 | 값 |
|------|-----|
| PR | https://github.com/dj-cajun/nhat-ky-cua-ban/pull/4 |
| Branch | `cursor/school-trust-boundary-plan-9985` |
| Commit SHA | `011491b7c61a8b5aa4d9eb29ee2bcd50d280e9fd` |
| `019` sha256 | `8b3c708e31a7f5613b03d542ba33faf1ac915007b59f683b2cfe0452b3a86c9e` |
| `020` sha256 | `db7aa92491b070232bf6ee6563518c76b4beca31d621ab86670227ec657923f9` |
| 모바일 빌드 번호 | _(staging 빌드 시 기입)_ |
| 테스트 시작 시각 (UTC) | 2026-07-25T05:48:00Z _(준비 시작)_ |
| 실행자 | Cursor cloud agent (자격 증명 대기) |

## 실행 차단 사유 (이 환경)

```text
BLOCKED — cannot execute B.1 matrix here
```

- Cloud environment에 `SUPABASE_URL` / service role / linked project **없음**
- Docker / local Supabase **불가** (`docker` 미설치)
- `environment.json` secrets **없음**

## 실측을 위해 필요한 것 (운영자 제공)

1. Staging Supabase project ref + Dashboard URL  
2. `supabase link` 가능한 access token **또는** DB connection string으로 `db push`  
3. Service role (계정 생성·`app_moderators` 시드용) — **클라이언트 번들 금지**  
4. Anon key (실제 Auth 로그인·JWT RPC 호출용)  
5. (선택) Expo staging 빌드 번호

제공되면 같은 SHA에서:

```text
001…018 → 019 → 020 replay
→ Auth 계정 A–E/M 생성
→ 경로 매트릭스 전수
→ 21 sign-off 채움
```

## 무효 규칙

테스트 도중 아래가 바뀌면 **전체 매트릭스 재실행**:

- commit SHA
- `019`/`020` checksum
- staging project ref
- migration 순서/내용
