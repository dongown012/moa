import type { Item } from "./types";

// 목업 데이터 — 실서비스에서는 RSS 수집기가 Supabase items 테이블을 채웁니다.
// 날짜는 "오늘 기준 상대 날짜"로 생성해 언제 열어도 데모가 자연스럽게 보입니다.

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

type Seed = Omit<Item, "id" | "published_at" | "deadline" | "url"> & {
  pub: number; // 오늘로부터 등록일 오프셋 (0 = 오늘)
  dl?: number; // 오늘로부터 마감일 오프셋
};

const seeds: Seed[] = [
  { category: "news", source: "소셜임팩트뉴스", title: "사회적기업 3,800곳 시대… “양적 성장 넘어 임팩트 측정으로”", summary: "인증 사회적기업이 역대 최다를 기록한 가운데, 성과 측정과 투명성 강화가 다음 과제로 떠오르고 있다.", extra: null, pub: 0 },
  { category: "grant", source: "서울시공익활동지원센터", title: "시민 공익활동 프로젝트 지원사업 (소액다건)", summary: "3인 이상 시민모임이면 신청 가능. 회계 부담을 낮춘 간이 정산 방식.", extra: "팀당 최대 300만 원", pub: 0, dl: 4 },
  { category: "job", source: "임팩트닷커리어", title: "아름다운가게 — 커뮤니케이션 매니저 (정규직)", summary: "브랜드 캠페인 기획·운영, 보도자료 작성. 비영리 홍보 경력 2년 이상 우대.", extra: "서울 마포 · 정규직", pub: -1, dl: 11 },
  { category: "news", source: "라이프인", title: "사회적협동조합 설립 절차 간소화 법안, 국회 상임위 통과", summary: "설립 인가 기간 단축과 서류 간소화를 담은 협동조합기본법 개정안이 상임위 문턱을 넘었다.", extra: null, pub: -1 },
  { category: "event", source: "빠띠", title: "시민대화 — “AI 시대, 시민의 자리는 어디인가”", summary: "공론장 시리즈 세 번째 모임. 누구나 참여 가능한 오픈 테이블.", extra: "19:00 · 온라인", pub: -1, dl: 10 },
  { category: "grant", source: "한국사회적기업진흥원", title: "2026 하반기 사회적기업가 육성사업 (추가모집)", summary: "창업팀당 최대 5,000만 원 사업비 + 멘토링 + 공간 지원. 예비·초기 창업팀 대상.", extra: "최대 5,000만 원", pub: -2, dl: 18 },
  { category: "job", source: "서울시공익활동지원센터", title: "공익활동 프로그램 코디네이터 채용", summary: "시민 공익활동 프로그램 기획·운영 및 커뮤니티 지원 업무.", extra: "서울 은평 · 계약직(전환 가능)", pub: -2, dl: 6 },
  { category: "edu", source: "서울시공익활동지원센터", title: "[모금 아카데미] 소액기부자 관리의 기술 (4주 과정)", summary: "기부자 여정 설계부터 감사 커뮤니케이션까지. 실습 중심 소규모 강좌.", extra: "무료 · 정원 20명", pub: -2, dl: 7 },
  { category: "news", source: "더버터", title: "기부금 세액공제 한도 확대 논의 본격화", summary: "고향사랑기부제 성과를 계기로 개인 기부 활성화를 위한 세제 개편 논의가 다시 불붙었다.", extra: null, pub: -2 },
  { category: "grant", source: "사회복지공동모금회", title: "2026 하반기 배분사업 — 지역사회 돌봄 분야", summary: "지역 기반 돌봄 사각지대 해소 사업. 비영리법인·비영리민간단체 신청 가능.", extra: "사업당 3,000만~1억 원", pub: -3, dl: 25 },
  { category: "job", source: "임팩트닷커리어", title: "루트임팩트 — 커뮤니티 매니저", summary: "체인지메이커 커뮤니티 운영, 멤버십 프로그램 기획.", extra: "서울 성수 · 정규직", pub: -3, dl: 14 },
  { category: "event", source: "다음세대재단", title: "체인지온 컨퍼런스 2026 — 사전등록 오픈", summary: "비영리와 기술의 만남을 다루는 연례 컨퍼런스. 올해 주제는 “작은 조직의 디지털 전환”.", extra: "서울", pub: -3, dl: 53 },
  { category: "news", source: "더나은미래", title: "[기획] 소셜벤처와 대기업 ESG의 만남, 3년의 성적표", summary: "오픈이노베이션 협업 사례 42건을 전수 분석했다. 절반은 지속, 나머지는 왜 멈췄나.", extra: null, pub: -3 },
  { category: "grant", source: "카카오임팩트", title: "카카오임팩트 펠로우십 7기 모집", summary: "사회문제 해결에 헌신하는 혁신가 개인 대상. 3년간 활동비 지원.", extra: "개인 대상 · 3년 지원", pub: -4, dl: 39 },
  { category: "event", source: "서울시공익활동지원센터", title: "비영리 실무자 네트워킹 데이 — 홍보·모금편", summary: "같은 고민을 하는 실무자들의 라운드테이블. 사례 나눔 + 자유 네트워킹.", extra: "15:00 · 은평", pub: -4, dl: 8 },
  { category: "edu", source: "씨닷", title: "퍼실리테이션 기초 워크숍 — 회의를 바꾸는 기술", summary: "참여형 워크숍 설계와 진행 스킬. 비영리·사회적경제 조직 실무자 대상.", extra: "유료", pub: -4, dl: 15 },
  { category: "news", source: "공익저널", title: "비영리 회계 공시 의무화 1년, 현장의 목소리", summary: "소규모 단체에게 여전히 높은 문턱… 지원 인프라 확충 요구 커져.", extra: null, pub: -4 },
  { category: "job", source: "임팩트닷커리어", title: "사단법인 점프 — 교육 프로그램 매니저", summary: "청소년 교육격차 해소 프로그램 운영 및 파트너십 관리.", extra: "서울 종로 · 정규직", pub: -5, dl: 9 },
  { category: "lib", source: "아름다운재단 기부문화연구소", title: "기빙코리아 2026 — 한국 기부문화 조사 보고서", summary: "개인 기부 참여율·기부처 신뢰도 등 20년 추적 데이터 최신판.", extra: "PDF · 무료 공개", pub: -5 },
  { category: "edu", source: "한국사회적기업진흥원", title: "사회적경제 회계·세무 실무 온라인 강좌 (상시)", summary: "사회적협동조합 결산·공시 실무를 다루는 상시 수강 과정.", extra: "온라인 · 무료", pub: -6 },
  { category: "lib", source: "트리플라잇", title: "임팩트 측정·관리(IMM) 실무 가이드 v3", summary: "소셜벤처와 비영리를 위한 임팩트 측정 프레임워크와 사례집.", extra: "PDF · 무료 공개", pub: -8 },
  { category: "lib", source: "한국사회적기업진흥원", title: "2025 사회적기업 실태조사 결과 보고서", summary: "고용·매출·정부지원 의존도 등 부문 전반의 기초 통계.", extra: "PDF · 무료 공개", pub: -11 },
];

export const MOCK_ITEMS: Item[] = seeds.map((s, i) => ({
  id: i + 1,
  title: s.title,
  summary: s.summary,
  source: s.source,
  url: `https://example.com/items/${i + 1}`,
  category: s.category,
  extra: s.extra,
  published_at: day(s.pub),
  deadline: s.dl !== undefined ? day(s.dl) : null,
}));
