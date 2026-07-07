import type { Item } from "./types";
import { stripHtml, truncate, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 기업마당(bizinfo.go.kr) 지원사업 공고 API.
// BIZINFO_API_KEY(.env.local)가 없으면 빈 배열을 반환해 조용히 건너뜁니다.
// 인증키 신청: https://www.bizinfo.go.kr/apiDetail.do?id=bizinfoApi (이메일로 자동 발송)

// 정부 지원사업 전체에서 소셜섹터 관련 공고만 추립니다.
const SOCIAL_KEYWORDS =
  /사회적\s?기업|사회적\s?경제|소셜\s?벤처|협동조합|마을기업|자활|비영리|공익\s?활동|임팩트/;

// API 응답 필드가 문서(title/link/…)와 실제(pblancNm/pblancUrl/…)가 다른 사례가 있어 둘 다 수용
interface BizinfoRow {
  title?: string;
  pblancNm?: string;
  link?: string;
  pblancUrl?: string;
  pubDate?: string;
  creatPnttm?: string;
  reqstDt?: string;
  reqstBeginEndDe?: string;
  author?: string;
  jrsdInsttNm?: string;
  excInsttNm?: string;
  description?: string;
  bsnsSumryCn?: string;
  hashtags?: string;
  trgetNm?: string;
}

// "20260131", "2026-01-31", "2026.01.31 18:00" 등 → "2026-01-31" (실패 시 null)
function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.replace(/[.\s]/g, "-").match(/(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// 신청기간 "20260101 ~ 20260131" → 마감일. "예산 소진시" 같은 값은 null.
function parseDeadline(period: string | undefined): string | null {
  if (!period) return null;
  const parts = period.split("~");
  return parseDate(parts[parts.length - 1]);
}

export async function fetchBizinfoGrants(): Promise<Item[]> {
  const key = process.env.BIZINFO_API_KEY;
  if (!key) return [];

  try {
    const url = `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${encodeURIComponent(key)}&dataType=json&searchCnt=300`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const rows: BizinfoRow[] = body?.jsonArray ?? body?.items ?? body?.item ?? [];

    const today = kstDateString();
    return rows
      .map((r): Item | null => {
        const title = stripHtml(r.title ?? r.pblancNm ?? "");
        const link = r.link ?? r.pblancUrl ?? "";
        // 본문(bsnsSumryCn)은 제외 — "비영리" 같은 단어가 스치듯 등장해 무관한 공고가 걸립니다
        const haystack = `${title} ${r.hashtags ?? ""}`;
        if (!title || !link || !SOCIAL_KEYWORDS.test(haystack)) return null;

        const deadline = parseDeadline(r.reqstDt ?? r.reqstBeginEndDe);
        if (deadline && deadline < today) return null; // 마감 지난 공고는 노이즈

        const summary = stripHtml(r.description ?? r.bsnsSumryCn ?? "");
        const fullLink = link.startsWith("http") ? link : `https://www.bizinfo.go.kr${link}`;
        return {
          id: urlToId(fullLink),
          title,
          summary: summary ? truncate(summary) : null,
          source: r.author ?? r.jrsdInsttNm ?? "기업마당",
          url: fullLink,
          category: "grant",
          extra: r.trgetNm ? truncate(stripHtml(r.trgetNm), 40) : null,
          published_at: parseDate(r.pubDate ?? r.creatPnttm) ?? today,
          deadline,
        };
      })
      .filter((i): i is Item => i !== null)
      .slice(0, 30);
  } catch (e) {
    console.error("기업마당 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
