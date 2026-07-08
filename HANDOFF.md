# 작업 인수인계 메모 (2026-07-07 갱신)

새 세션에서 이 파일을 읽으면 진행 상황을 이어받을 수 있습니다.

## 완료된 것

- Node.js v24.18.0을 nvm으로 설치 (`~/.zshrc`에 등록됨)
- `모아-프로토타입-v4.html` 디자인을 그대로 이식한 Next.js 앱 (이 폴더)
  - 빌드 통과, 브라우저에서 탭·검색·북마크·마감 스트립 동작 확인 완료
- Supabase 스키마 완성: `supabase/schema.sql` (items + sources 테이블, RLS, 실제 피드 9곳 시드 포함)
- 실제 RSS 제공이 확인된 소셜섹터 매체 9곳: `src/lib/feeds.ts`
  (라이프인, 이로운넷, 더나은미래, 임팩트온, 소셜임팩트뉴스, 한국NGO신문, 웰페어뉴스, 복지타임즈, 웰페어이슈 — 모두 뉴스 카테고리)
  - 데일리임팩트·미디어SR은 경제TV로 리브랜딩되어 제외
  - 희망제작소·함께일하는재단·빠띠 미디엄은 RSS 미제공 확인
  - **ESG경제·한경ESG 검토 후 제외 (2026-07-08):** 한경ESG는 전용 RSS 없음.
    ESG경제는 RSS 있으나 대기업 지속가능경영 중심 — 소셜섹터 키워드 필터 시 65건 중 5건(8%)만 통과,
    그마저도 절반이 기업 사회공헌 홍보성. 수율·품질 모두 낮아 제외. 임팩트온 제외와 같은 판단.
    ("사회 이슈 심층 기사"는 더나은미래(공익)·이로운넷이 이미 소셜섹터 관점으로 커버)
- **뉴스 외 카테고리 피드 4곳 추가 (2026-07-07):** 아름다운재단 행사안내(event)·연구보고서(lib),
  기부문화연구소(lib), 다음세대재단(news) — 아름다운재단은 WordPress라 `/category/<slug>/feed/` 패턴 사용
  - 이전 메모의 "아름다운재단 RSS 미제공"은 오류였음 (WordPress 피드 정상 동작)
  - 루트임팩트 피드는 존재하나 항목이 비어 있어 제외
- **채용·지원사업·교육은 RSS 없음 확인** — 서울 열린데이터광장 OA-16158/OA-16159는
  2023년 서비스 종료로 사용 불가. 채용은 고용24(워크넷) API 또는 impact.career 크롤러가 남은 선택지
- **기업마당 지원사업 수집기 구현 + 가동 중 (2026-07-07):** `src/lib/grants.ts`
  - 인증키 발급 완료 (`.env.local`의 `BIZINFO_API_KEY` — 발급 명의·등록 IP는 비공개 메모 참고)
  - 실응답 필드 검증 완료: pblancNm/pblancUrl/reqstBeginEndDe/jrsdInsttNm/bsnsSumryCn/hashtags/trgetNm
  - 소셜섹터 키워드 필터는 **제목+해시태그만** 검사 (본문 포함 시 "비영리" 등이 스치듯 걸려 노이즈 발생)
  - 마감 지난 공고 제외, 최근 300건 조회 → 현재 유효 공고 9건 수집됨
  - `collectLiveItems()`(data.ts)로 RSS+기업마당을 묶어 페이지와 /api/collect가 공유
  - `.env.local`은 `.gitignore`의 `.env*`로 커밋 제외 확인됨
- **실시간 RSS 수집 완료 (2026-07-07):**
  - `src/lib/rss.ts` — FEEDS 병렬 수집(피드당 12건, 실패 무시), HTML 제거,
    URL FNV-1a 해시로 안정적 id(북마크 유지), KST 날짜 변환(미래 날짜는 오늘로 보정), URL 중복 제거
  - `src/lib/data.ts` — 3단계 모드: Supabase 있으면 `db` / 없으면 RSS 뉴스 + 목업(비뉴스) 병합 `live` / RSS 전멸 시 `mock`
  - `src/app/page.tsx` — today를 `kstDateString()`으로, mode 전달
  - `src/components/HomeClient.tsx` — `mode` prop, 푸터 문구 분기
  - `src/app/api/collect/route.ts` — GET + `Authorization: Bearer $CRON_SECRET`로 인증,
    service_role 키로 items에 upsert(url 충돌 시 기존 유지) → Vercel Cron 연결용
  - 빌드 통과 + 브라우저 확인 완료: 9개 피드 전부 수집 성공 (뉴스 108건, 전체 125건, live 모드)

- **임팩트닷커리어 크롤러 구현 완료 (2026-07-07):** `src/lib/jobs.ts`
  - 채용(기본 목록 20건→job)과 교육 프로그램(`?career[type]=program` 15건→edu) 모두 수집
  - 목록이 서버 렌더링이라 HTML에서 직접 추출 (키 불필요). 프로그램 카드는 첫 줄이 해시태그
  - 마감 지난 공고 제외. 게시일이 없어 published_at은 수집일
  - 참고: worktogether.or.kr는 사회적기업 채용포털이 아니라 한국장애인고용공단 포털이었음 (제외)
  - 고용24·공공데이터포털 방식은 사용자 결정으로 보류
- **오렌지레터 크롤러 구현 완료 (2026-07-07):** `src/lib/orange.ts`
  - robots.txt 크롤링 허용 확인. sitemap.xml에서 최신 호(/p/최대번호)를 찾아 파싱
  - 섹션→카테고리: (채용)→job, (교육/모임)→edu, (공모/지원)→grant, (행사)→event
  - 항목 형식이 섹션별로 다름: 채용 `경력 | <b>조직</b> 제목 (~7/7)`, 그 외 `조직 | <b>제목</b> (~7/7)`,
    행사는 `@장소(지역)` 부가 — 뉴스레터 마크업 변경 시 parseSection 점검 필요
  - 마감 연도는 KST 오늘 기준 추정(60일 이상 과거면 이듬해), 마감 지난 항목 제외
  - 서울시공익활동지원센터(seoulpa.kr) 교육은 목록이 JS 로딩이라 보류
- **홍익지능(hi-ai.kr) AI 리포트 수집 완료 (2026-07-07):** `src/lib/hiai.ts`
  - 리포트가 WP 커스텀 포스트 타입이라 일반 피드가 비어 있음 → REST API `/wp-json/wp/v2/report` 사용
  - education/usecase/column 타입도 같은 방식으로 추가 가능
- **뉴스 노이즈 제거 — 섹션별 RSS로 교체 (2026-07-07):**
  ND소프트 CMS 매체는 섹션별 RSS(`rss/S{n}N{n}.xml`)를 제공 — 전체기사 대신 관련 섹션만 구독
  - 이로운넷: S1N1 사회연대경제 (다른 섹션: S1N2 기후/생명/평화, S1N4 정치/사회, S1N5 경제/산업, S1N6 전국)
  - 임팩트온: S1N6 업계소식만 — 전체기사는 기업 ESG·글로벌 산업 뉴스뿐(39건 중 소셜섹터 0건 확인),
    업계소식(사회공헌)은 볼륨이 매우 낮음(1건 수준). 계속 0~1건이면 매체 제외 검토
  - 한국NGO신문: S1N72 나눔과연대만 (경제 S1N73·지방시대 S1N74가 노이즈원.
    공정사회 S1N69도 잠깐 넣었다가 사건·정치 기사가 섞여 사용자 요청으로 제외)
- **전 카테고리 실데이터 달성:** 뉴스 116 · 채용 41 · 지원사업 27 · 모임행사 17 · 교육 32 · 자료실 16
  (전체 249건, 목업 잔여 0 — 푸터 문구는 example.com 항목 유무로 자동 판단)

- **서비스 보완 (2026-07-07):**
  - git 저장소 초기화 + 커밋 시작 (.env.local은 .gitignore로 제외)
  - 소스별 수집 통계: `collectLiveItems()`가 `{ items, stats }` 반환.
    `/api/collect`가 Supabase 없이도 통계를 반환해 모니터링 용도로 사용 가능
    (`zeroSources` 배열에 0건 소스 = 장애/개편 신호. CRON_SECRET은 .env.local에 있음)
  - 제목 기반 중복 제거: 복지 매체 3곳이 같은 보도자료를 싣는 문제 해결 (뉴스 117→105)
  - 마감일 없는 모임·행사는 발행 60일 후 자동 숨김 (아름다운재단 지난 행사 정리)

- **Supabase → Vercel Postgres 전환 (2026-07-07):** 사용자 요청("Vercel 하나로")
  - `@supabase/supabase-js` 제거, `postgres`(postgres.js) 드라이버로 교체 (`src/lib/db.ts`)
  - `DATABASE_URL`/`POSTGRES_URL` 없으면 기존처럼 live 모드 — Vercel Storage에서 DB 만들면 자동 전환
  - 스키마는 `/api/collect` 최초 실행 때 자동 생성 (`ensureSchema`) — SQL 손 실행 불필요, supabase/ 폴더 삭제
  - DB는 서버 전용 접근이라 RLS 불필요. **주의: DB 경로는 로컬에 Postgres가 없어 배포 후 검증 필요**
  - `/admin?key=ADMIN_SECRET` 관리 페이지: DB 연결 시 출처별 현황+최근 60건+삭제,
    미연결 시 실시간 수집 통계(0건 소스 경고 표시). ADMIN_SECRET은 .env.local에 있음

## 배포 완료 (2026-07-07)

- **프로덕션: https://moa-social.vercel.app** (Vercel Hobby, 함수 리전 icn1 서울)
- 저장소: https://github.com/dongown012/moa (공개 — 개인정보는 공개 전 제거, 히스토리 정리됨)
- DB: Vercel Storage → Neon Postgres(무료). 첫 수집으로 스키마 자동 생성, 220건 저장, db 모드 동작 확인
- 수집 트리거 3중: Vercel Cron(매일 KST 06시) + GitHub Actions(하루 5회, APP_URL·CRON_SECRET
  시크릿 등록 완료) + 홈 재생성 시 after() 백그라운드 수집
- 기업마당: Vercel에서도 정상 수집 (IP 등록 제한 없음 확인)
- **알려진 한계: 아름다운재단 계열 3개 피드(행사·연구보고서·기부문화연구소)는 Vercel에서 0건**
  — 로컬·타 클라우드에선 정상이라 해당 기관 방화벽의 AWS IP 차단으로 추정.
  대안: GitHub Actions 러너(Azure IP)에서 직접 수집해 DB에 넣는 방식 검토 가능
- 키 관리: 모든 비밀값은 로컬 `moa/.env.local` + Vercel 환경변수 + GitHub Secrets에만 존재

## 서비스 개선 (2026-07-07 저녁)

- 클릭 분석: clicks 테이블 + sendBeacon(/api/click) → /admin에 7일 인기 TOP15·일별 추이
- Vercel Web Analytics 삽입 (방문·유입 — **대시보드 Analytics 탭에서 Enable 필요**)
- SAVE(북마크) 제거 (회원 기능 도입 시 git 히스토리에서 복원)
- 모바일 가독성: 한 열 배치·행간 상향·word-break:keep-all·통계 2×2 그리드
- 날짜 그룹 내 출처 라운드로빈 (같은 매체 연속 방지)
- OG 이미지(src/app/opengraph-image.png, sharp로 생성) + 메타데이터
- 뉴스레터 이메일 수집: subscribers 테이블 + /api/subscribe + 폼 연동 (/admin에 목록)
- 자체 RSS 제공: /rss (원문 링크로 연결, 50건)
- sitemap.xml + robots.txt (admin·api는 크롤 차단)
- 카테고리 딥링크: /?cat=job 형태 (클라이언트에서 처리해 ISR 유지)

## 남은 작업 (다음 단계 후보)

- ~~검색엔진 등록~~ ✅ 완료 (2026-07-08 구글 서치콘솔·네이버 서치어드바이저 소유확인 + 사이트맵 제출)
- WEEKLY 뉴스레터 실제 발송 (구독자는 모이는 중)
- 아름다운재단 계열 피드 우회 수집 (GitHub Actions 러너 활용)
- 커스텀 도메인

## 실행 방법

```bash
cd moa && npm run dev   # http://localhost:3000
# 수집 엔드포인트 로컬 테스트:
# curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/collect
```

프리뷰 서버 설정은 상위 폴더 `.claude/launch.json`의 `moa-dev` 참고 (autoPort 켜져 있음).
