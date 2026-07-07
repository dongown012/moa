# 모아. — 소셜섹터 인덱스

한국 소셜섹터(비영리·사회적경제) 소식을 한 페이지로 모아 보여주는 서비스.
뉴스 / 채용 / 지원사업 / 모임·행사 / 교육 / 자료실 여섯 카테고리를 하루 몇 번 자동 수집합니다.

모든 항목은 제목·요약만 보여주고 원문으로 연결합니다. 콘텐츠 저작권은 각 출처에 있습니다.

## 데이터 소스

| 방식 | 출처 |
|---|---|
| RSS | 라이프인, 이로운넷(사회연대경제), 더나은미래, 임팩트온(업계소식), 소셜임팩트뉴스, 한국NGO신문(나눔과연대), 웰페어뉴스, 복지타임즈, 웰페어이슈, 아름다운재단(행사·연구보고서), 기부문화연구소, 다음세대재단 |
| 공공 API | 기업마당 지원사업 공고 (소셜섹터 키워드 필터) |
| REST API | 홍익지능 AI 리포트 (WordPress 커스텀 포스트 타입) |
| 크롤링 | 임팩트닷커리어 채용·프로그램, 오렌지레터 최신호(채용/교육·모임/공모·지원/행사) |

수집 원칙: robots.txt 준수, 마감 지난 공고 제외, URL·제목 기준 중복 제거,
전체기사 대신 소셜섹터 섹션만 구독(노이즈 방지).

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

환경변수 없이도 동작합니다(실시간 수집 모드). `.env.local.example`을 `.env.local`로
복사해 필요한 키만 채우세요 — 각 키가 없으면 해당 기능만 조용히 꺼집니다.

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | Postgres 연결(Vercel Storage에서 자동 주입). 없으면 매 렌더링마다 실시간 수집 |
| `CRON_SECRET` | `/api/collect` 수집 엔드포인트 인증 |
| `ADMIN_SECRET` | `/admin?key=…` 관리 페이지 접근 |
| `BIZINFO_API_KEY` | 기업마당 지원사업 API ([신청](https://www.bizinfo.go.kr/apiDetail.do?id=bizinfoApi)) |

## 동작 방식

```
                    ┌─ RSS 12피드 ─────────┐
/api/collect ───────┼─ 기업마당 API ────────┼──→ 중복 제거 ──→ Postgres items
(Cron/Actions 호출)  ├─ 임팩트닷커리어 크롤 ──┤                    │
                    ├─ 오렌지레터 크롤 ─────┤                    ↓
                    └─ 홍익지능 REST ──────┘         홈(ISR 1시간) ← DB 조회
```

- **DB 없음(live 모드)**: 페이지 재생성 때 직접 수집해 바로 보여줌 (데모·로컬용)
- **DB 있음(db 모드)**: 페이지는 DB만 읽어 빠르고, 수집은 뒤에서 —
  ① Vercel Cron 하루 1회(무료 플랜 한도) ② GitHub Actions 하루 5회(`.github/workflows/collect.yml`)
  ③ 방문으로 페이지가 재생성될 때 `after()`로 백그라운드 수집
- 스키마는 수집기가 최초 실행 때 자동 생성 — 수동 SQL 불필요 (`src/lib/db.ts`)
- `/admin?key=ADMIN_SECRET`: 출처별 수집 현황, 최근 항목, 삭제. 0건 소스는 장애 신호로 표시

## 구조

```
src/lib/feeds.ts     RSS 피드 목록 (섹션 단위로 노이즈 필터링)
src/lib/rss.ts       RSS 병렬 수집 + 소스별 통계
src/lib/grants.ts    기업마당 지원사업 API
src/lib/jobs.ts      임팩트닷커리어 채용·교육 크롤러
src/lib/orange.ts    오렌지레터 뉴스레터 파서 (sitemap으로 최신호 탐지)
src/lib/hiai.ts      홍익지능 리포트 (WP REST API)
src/lib/data.ts      수집 통합·중복 제거·모드 결정(db/live/mock)
src/lib/db.ts        Postgres 연결 + 스키마 자동 생성
src/app/page.tsx     메인 (ISR 1시간 + 백그라운드 수집)
src/app/admin/       관리 페이지
src/app/api/collect/ 수집 엔드포인트 (Bearer 인증)
```

## 배포 (Vercel 무료 플랜 기준)

1. 이 저장소를 GitHub에서 Vercel로 Import
2. Storage → Create Database → **Postgres** (DATABASE_URL 자동 주입)
3. 환경변수 `CRON_SECRET`, `ADMIN_SECRET`, `BIZINFO_API_KEY` 등록 후 재배포
4. GitHub 저장소 Secrets에 `APP_URL`(배포 주소), `CRON_SECRET` 등록 → Actions 수집 활성화

## 크롤러 유지보수

크롤링 대상 사이트가 개편되면 해당 소스만 조용히 0건이 됩니다.
`/api/collect` 응답의 `zeroSources` 또는 `/admin` 페이지에서 확인하고
각 파일 상단 주석의 파싱 규칙을 점검하세요.
