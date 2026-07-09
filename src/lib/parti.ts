import type { Item } from "./types";
import { stripHtml, truncate, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 빠띠 시민대화(talks.campaigns.do) — 사회적협동조합 빠띠가 운영하는 시민 공론장.
// RSS는 없지만 /goals 목록이 서버 렌더링(최신순)이라 카드에서 직접 추출합니다.
// 목록에 날짜가 없어 발행일을 알 수 없으므로 수집일로 기록하고, 최신순 상위 N개만 담습니다.
// (DB 모드에선 최초 수집일이 고정되어, 오래된 공론장은 발행 60일 후 자동 숨김에 맡겨집니다.)

const LIST_URL = "https://talks.campaigns.do/goals";
const BASE = "https://talks.campaigns.do";
const LIMIT = 12;

// 카드: <a href="/goals/slug"> <img> <h5 gray-900>대표 질문</h5> <h5 gray-500>공론장 이름</h5> </a>
const CARD_RE = /<a[^>]*href="(\/goals\/[a-zA-Z0-9_-]+)"[^>]*>([\s\S]*?)<\/a>/g;
const clean = (s: string) => stripHtml(s).replace(/ㅤ/g, " ").replace(/\s+/g, " ").trim();

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
      const url = `${BASE}${m[1]}`;
      if (seen.has(url)) continue;
      seen.add(url);

      // 첫 h5(gray-900)=대표 질문, 둘째 h5(gray-500)=공론장 이름
      const q = clean((m[2].match(/<h5[^>]*text-gray-900[^>]*>([\s\S]*?)<\/h5>/) ?? [])[1] ?? "");
      const sub = clean((m[2].match(/<h5[^>]*text-gray-500[^>]*>([\s\S]*?)<\/h5>/) ?? [])[1] ?? "");
      const title = q || sub;
      if (title.length < 4) continue;

      items.push({
        id: urlToId(url),
        title: truncate(title, 70),
        summary: q && sub ? truncate(sub, 80) : null, // 질문이 제목이면 공론장 이름을 요약으로
        source: "빠띠 시민대화",
        url,
        category: "event",
        extra: "시민 공론장",
        published_at: today, // 목록에 날짜가 없어 수집일 기록
        deadline: null,
      });
      if (items.length >= LIMIT) break;
    }
    return items;
  } catch (e) {
    console.error("빠띠 시민대화 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
