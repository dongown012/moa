import type { Category } from "./types";

export interface FeedDef {
  name: string; // 출처 표시명
  feedUrl: string;
  siteUrl: string;
  category: Category;
  limit?: number; // 피드당 최대 수집 건수 (기본 12)
}

// 2026-07 기준 실제 RSS 제공이 확인된 소셜섹터 매체들.
// 채용·지원사업·행사는 RSS를 제공하는 곳이 없어 별도 크롤러가 필요합니다 (README 참고).
export const FEEDS: FeedDef[] = [
  { name: "라이프인",       feedUrl: "http://www.lifein.news/rss/allArticle.xml",          siteUrl: "http://www.lifein.news",       category: "news" },
  // 이로운넷은 전체기사에 지역 일반뉴스가 많아 '사회연대경제' 섹션(S1N1)만 구독
  { name: "이로운넷",       feedUrl: "http://www.eroun.net/rss/S1N1.xml",                  siteUrl: "http://www.eroun.net",         category: "news" },
  // 더나은미래 전체 피드엔 기업 비즈니스 기사(경제/산업/ESG 섹션)가 섞여 '공익' 카테고리만 구독
  { name: "더나은미래",     feedUrl: "https://futurechosun.com/archives/category/public-interest/feed", siteUrl: "https://futurechosun.com", category: "news" },
  // 임팩트온 전체기사는 기업 ESG·글로벌 산업 뉴스뿐(2026-07 확인, 39건 중 소셜섹터 0건)
  // → 사회공헌 소식이 실리는 '업계소식'(S1N6)만 구독 (볼륨 낮음)
  { name: "임팩트온",       feedUrl: "http://www.impacton.net/rss/S1N6.xml",               siteUrl: "http://www.impacton.net",      category: "news" },
  { name: "소셜임팩트뉴스", feedUrl: "http://www.socialimpactnews.net/rss/allArticle.xml", siteUrl: "http://www.socialimpactnews.net", category: "news" },
  // 한국NGO신문 전체기사는 지자체 행정·금융 PR이 섞여 '나눔과연대' 섹션만 구독
  // ('공정사회' S1N69는 사건·정치 기사가 섞여 사용자 요청으로 제외)
  { name: "한국NGO신문",    feedUrl: "http://www.ngonews.kr/rss/S1N72.xml",                siteUrl: "http://www.ngonews.kr",        category: "news" },
  { name: "웰페어뉴스",     feedUrl: "http://www.welfarenews.net/rss/allArticle.xml",      siteUrl: "http://www.welfarenews.net",   category: "news" },
  { name: "복지타임즈",     feedUrl: "http://www.bokjitimes.com/rss/allArticle.xml",       siteUrl: "http://www.bokjitimes.com",    category: "news" },
  { name: "웰페어이슈",     feedUrl: "http://www.welfareissue.com/rss/allArticle.xml",     siteUrl: "http://www.welfareissue.com",  category: "news" },

  // ── 뉴스 외 카테고리 (2026-07-07 확인) ──
  // 아름다운재단은 WordPress라 카테고리별 피드가 나옵니다. 갱신 주기가 월 단위로 느려 limit을 낮춤.
  { name: "아름다운재단",         feedUrl: "https://beautifulfund.org/category/event/feed/",           siteUrl: "https://beautifulfund.org",          category: "event", limit: 8 },
  { name: "아름다운재단",         feedUrl: "https://beautifulfund.org/category/research_report/feed/", siteUrl: "https://beautifulfund.org",          category: "lib",   limit: 8 },
  { name: "기부문화연구소",       feedUrl: "https://research.beautifulfund.org/feed",                  siteUrl: "https://research.beautifulfund.org", category: "lib",   limit: 8 },
  { name: "다음세대재단",         feedUrl: "https://www.daumfoundation.org/feed",                      siteUrl: "https://www.daumfoundation.org",     category: "news",  limit: 8 },
];
