<p align="center">
  <img src="public/logo.png" width="280" alt="모아 로고">
</p>

<h1 align="center">모아 — 소셜섹터 인덱스</h1>

<p align="center">
  한국 소셜섹터(비영리·사회적경제)의 뉴스, 채용, 지원사업, 모임·행사, 교육, 자료를<br>
  매일 자동 수집해 <b>한 페이지</b>로 보여주는 데일리 인덱스.<br>
  <a href="https://moa-social.vercel.app"><b>moa-social.vercel.app</b></a>
</p>

---

## 왜 만들었나

소셜섹터에서 일하는 사람이 하루를 시작하며 봐야 할 정보는 여기저기 흩어져 있습니다.
전문 매체만 여남은 곳이고, 채용은 채용 플랫폼에, 지원사업 공고는 각 재단과 정부 사이트에,
행사와 교육은 뉴스레터 구석에 있습니다. 그런데 이 동네에는 RSS 문화조차 약해서
구독기로 모아 보기도 어렵습니다.

모아는 그 순회를 대신합니다. RSS가 있는 곳은 RSS로, API가 있는 곳은 API로,
둘 다 없는 곳은 크롤링으로 — 매일 여러 번 수집해서 마감 임박한 것부터 보여주고,
클릭하면 원문으로 보냅니다. 제목과 요약만 보여주고 원문으로 연결하는 인덱스이므로
콘텐츠 저작권은 각 출처에 있습니다.

## 디자인 컨셉 — "일간지 1면"

<p align="center">
  <img src="src/app/opengraph-image.png" width="600" alt="모아 OG 이미지">
</p>

화려한 카드형 피드 대신 **신문 지면**의 문법을 빌렸습니다. 아침에 한 번,
길게 훑고 닫는 매체라는 점에서 소셜섹터 인덱스는 SNS보다 신문에 가깝기 때문입니다.

- **마스트헤드**: 날짜(DAILY INDEX)와 그날의 지표 — 오늘 새 소식, 이번 주 마감, 수집 출처
- **CLOSING SOON 스트립**: 신문의 속보 티커처럼, 카테고리를 가로질러 마감 임박 공고가 흐름
- **텍스트 온리**: 이미지 없이 제목·요약·출처·D-day만. 정보 밀도와 로딩 속도, 원문 존중을 모두 얻음
- **타이포그래피**: 국문 SUIT Variable + 데이터·라벨용 IBM Plex Mono의 신문 조판 대비
- **색은 세 가지면 충분**: 종이 흰색과 잉크 검정(#141414) 위에 코발트(#1D40C8) 하나만 포인트로.
  마감 임박(D-5 이하)에만 빨강을 허락
- **편집 원칙이 곧 정렬 알고리즘**: 같은 날짜 안에서 카테고리와 출처를 번갈아 배치해
  "같은 종류만 주르륵"을 막고, 각 카테고리는 마감 임박한 것부터

로고도 같은 원칙입니다 — 잉크 검정의 "모아"에 코발트 마침표 하나
(<img src="public/symbol.png" width="16" alt="심볼"> 심볼 버전은 `public/symbol.png`).
"오늘 볼 것, 여기 다 모아뒀다"는 문장의 마침표입니다.

## 데이터 소스

| 방식 | 출처 |
|---|---|
| RSS | 라이프인, 이로운넷(사회연대경제), 더나은미래(공익), 임팩트온(업계소식), 소셜임팩트뉴스, 한국NGO신문(나눔과연대), 웰페어뉴스, 복지타임즈, 웰페어이슈, 아름다운재단(행사·연구보고서), 기부문화연구소, 다음세대재단 |
| 공공 API | 기업마당 지원사업 공고 (소셜섹터 키워드 필터) |
| REST API | 홍익지능 AI 리포트 (WordPress 커스텀 포스트 타입) |
| 크롤링 | 임팩트닷커리어 채용·프로그램, 오렌지레터 최신호(채용/교육·모임/공모·지원/행사) |

수집 원칙: robots.txt 준수, 마감 지난 공고 제외, URL·제목 기준 중복 제거,
전체기사 대신 소셜섹터 섹션만 구독(노이즈 방지), 요약에서 바이라인 제거 후 문장 단위로 자르기.

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
/api/collect ───────┼─ 기업마당 API ────────┼──→ 중복 제거·차단 필터 ──→ Postgres items
(Cron/Actions 호출)  ├─ 임팩트닷커리어 크롤 ──┤                             │
                    ├─ 오렌지레터 크롤 ─────┤                             ↓
                    └─ 홍익지능 REST ──────┘              홈(ISR 1시간) ← DB 조회
```

- **DB 없음(live 모드)**: 페이지 재생성 때 직접 수집해 바로 보여줌 (데모·로컬용)
- **DB 있음(db 모드)**: 페이지는 DB만 읽어 빠르고, 수집은 뒤에서 —
  ① Vercel Cron 하루 1회(무료 플랜 한도) ② GitHub Actions 하루 5회(`.github/workflows/collect.yml`)
  ③ 방문으로 페이지가 재생성될 때 `after()`로 백그라운드 수집
- 스키마는 수집기가 최초 실행 때 자동 생성 — 수동 SQL 불필요 (`src/lib/db.ts`)
- `/admin?key=ADMIN_SECRET`: 출처별 수집 현황·클릭 통계·구독 신청 목록·항목 삭제.
  삭제한 항목은 `blocked_urls`에 기록되어 재수집되지 않음. 0건 소스는 장애 신호로 표시
- `/rss`: 모아가 수집한 것을 다시 통합 피드로 제공 (원문 링크, 50건)
- 콘텐츠 클릭은 `sendBeacon`으로 기록, 방문·유입경로는 Vercel Web Analytics

## 구조

```
src/lib/feeds.ts     RSS 피드 목록 (섹션 단위로 노이즈 필터링)
src/lib/rss.ts       RSS 병렬 수집 + 소스별 통계 + 요약 정리(바이라인 제거·문장 단위 자르기)
src/lib/grants.ts    기업마당 지원사업 API
src/lib/jobs.ts      임팩트닷커리어 채용·교육 크롤러
src/lib/orange.ts    오렌지레터 뉴스레터 파서 (sitemap으로 최신호 탐지)
src/lib/hiai.ts      홍익지능 리포트 (WP REST API)
src/lib/data.ts      수집 통합·중복 제거·차단 필터·모드 결정(db/live/mock)
src/lib/db.ts        Postgres 연결 + 스키마 자동 생성
src/app/page.tsx     메인 (ISR 1시간 + 백그라운드 수집)
src/app/admin/       관리 페이지
src/app/api/         collect(수집) · click(클릭 기록) · subscribe(뉴스레터 신청)
src/app/rss/         모아 통합 RSS 출력
```

## 배포 (Vercel 무료 플랜 기준)

1. 이 저장소를 GitHub에서 Vercel로 Import (함수 리전은 `vercel.json`에서 서울 icn1)
2. Storage → Create Database → **Postgres** (DATABASE_URL 자동 주입)
3. 환경변수 `CRON_SECRET`, `ADMIN_SECRET`, `BIZINFO_API_KEY` 등록 후 재배포
4. GitHub 저장소 Secrets에 `APP_URL`(배포 주소), `CRON_SECRET` 등록 → Actions 수집 활성화

## 크롤러 유지보수

크롤링 대상 사이트가 개편되면 해당 소스만 조용히 0건이 됩니다.
`/api/collect` 응답의 `zeroSources` 또는 `/admin` 페이지에서 확인하고
각 파일 상단 주석의 파싱 규칙을 점검하세요.

알려진 한계: 아름다운재단 계열 3개 피드는 Vercel(AWS) 대역에서 간헐적으로 차단됩니다.

---

<p align="center">
  이 서비스는 Claude Code와의 협업으로 하루 만에 기획·개발·배포되었습니다.<br>
  소셜섹터에 작은 보탬이 되기를 바랍니다. 🍊
</p>
