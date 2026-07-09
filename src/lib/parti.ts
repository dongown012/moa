import type { Item } from "./types";
import { stripHtml, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 빠띠 시민대화(talks.campaigns.do) — 사회적협동조합 빠띠가 운영하는 시민 공론장.
// RSS는 없지만 목록이 서버 렌더링이라 카드에서 직접 추출합니다.
// 공론장은 상시성이라 마감일이 없어, 발행 60일 후 자동 숨김(hideStaleEvents)에 맡깁니다.

const LIST_URL = "https://talks.campaigns.do/";
const BASE = "https://talks.campaigns.do";

// 카드: <a class="block ... border" href="/goals/slug"> 제목 … 발행일 YYYY-MM-DD </a>
const CARD_RE = /<a class="block[^"]*border"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

export async function fetchPartiTalks(): Promise<Item[]> {
  try {
    const res = await fetch(LIST_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const today = kstDateString();
    const seen = new Set<string>();
    const items: Item[] = [];

    for (const m of html.matchAll(CARD_RE)) {
      const url = m[1].startsWith("http") ? m[1] : `${BASE}${m[1]}`;
      if (seen.has(url)) continue;
      seen.add(url);

      const date = (m[2].match(/(\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? today;
      // 제목: 태그·날짜·'발행일' 라벨·특수 공백(U+3164) 정리
      const title = stripHtml(m[2])
        .replace(/\d{4}-\d{2}-\d{2}/, "")
        .replace(/발행일/g, "")
        .replace(/ㅤ/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (title.length < 4) continue;

      items.push({
        id: urlToId(url),
        title,
        summary: null,
        source: "빠띠 시민대화",
        url,
        category: "event",
        extra: "시민 공론장",
        published_at: date > today ? today : date,
        deadline: null,
      });
    }
    return items;
  } catch (e) {
    console.error("빠띠 시민대화 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
