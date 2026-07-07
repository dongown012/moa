import type { Category, Item } from "./types";
import { stripHtml, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 임팩트닷커리어(impact.career) 크롤러 — 소셜섹터 전용 플랫폼(루트임팩트 운영)이라
// 별도 키워드 필터가 필요 없습니다. 목록이 서버 렌더링이라 HTML에서 바로 추출합니다.
// 채용(기본 목록)과 교육 프로그램(?career[type]=program)을 같은 카드 구조로 제공합니다.
// 사이트 개편 시 CARD_RE 점검 필요.

const BASE = "https://impact.career";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// 카드 한 장 = <a href="/impactcareer/grantors/careers/ID">[해시태그]/제목/조직/마감/경력·지역…</a>
const CARD_RE = /<a[^>]*href="(\/impactcareer\/grantors\/careers\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

// "2026.07.15" → "2026-07-15", "상시오픈"·"성사시 마감" → null
function parseDeadline(raw: string): string | null {
  const m = raw.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

async function fetchCareerList(listUrl: string, category: Category, limit: number): Promise<Item[]> {
  const res = await fetch(listUrl, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const today = kstDateString();
  const seen = new Set<string>();
  const items: Item[] = [];

  for (const m of html.matchAll(CARD_RE)) {
    const url = `${BASE}${m[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);

    // 태그를 줄바꿈으로 바꿔 카드 안의 텍스트 조각을 순서대로 얻습니다
    const lines = m[2]
      .replace(/<[^>]*>/g, "\n")
      .split("\n")
      .map((s) => stripHtml(s))
      .filter(Boolean);
    // 프로그램 카드는 첫 줄이 "#교육 #청년" 같은 해시태그
    if (lines[0]?.startsWith("#")) lines.shift();
    if (lines.length < 2) continue;

    const [title, org, deadlineRaw, ...rest] = lines;
    const deadline = parseDeadline(deadlineRaw ?? "");
    if (deadline && deadline < today) continue; // 마감 지난 공고 제외

    items.push({
      id: urlToId(url),
      title,
      summary: null,
      source: org ?? "임팩트닷커리어",
      url,
      category,
      // 채용: "경력 · 지역", 프로그램: "지역"
      extra: rest.slice(0, 2).join(" · ") || null,
      // 목록에 게시일이 없어 수집일로 기록 — DB 모드에서는 최초 수집일이 유지됩니다
      published_at: today,
      deadline,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export async function fetchImpactCareerJobs(): Promise<Item[]> {
  try {
    return await fetchCareerList(`${BASE}/impactcareer/grantors/careers`, "job", 20);
  } catch (e) {
    console.error("임팩트닷커리어 채용 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function fetchImpactCareerPrograms(): Promise<Item[]> {
  try {
    return await fetchCareerList(
      `${BASE}/impactcareer/grantors/careers?career%5Btype%5D=program`,
      "edu",
      15
    );
  } catch (e) {
    console.error("임팩트닷커리어 프로그램 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
