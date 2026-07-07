import type { Category, Item } from "./types";
import { stripHtml, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 오렌지레터(orangeletter.stibee.com) — 소셜섹터 주간 뉴스레터.
// robots.txt가 크롤링을 허용하고 sitemap.xml이 있어, 최신 호를 찾아
// 채용/교육·모임/공모·지원/행사 섹션의 큐레이션 링크를 원문 연결로 가져옵니다.
// 뉴스레터 마크업이 바뀌면 SECTION/ITEM 정규식 점검 필요.

const BASE = "https://orangeletter.stibee.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// 섹션 헤더 "🍊 (채용) ..." → 카테고리 매핑
const SECTIONS: { marker: string; category: Category }[] = [
  { marker: "(채용)", category: "job" },
  { marker: "(교육/모임)", category: "edu" },
  { marker: "(공모/지원)", category: "grant" },
  { marker: "(행사)", category: "event" },
];

// 항목: • <a href="URL">경력 | <b>조직</b> 제목 (~7/7)</a>  (구형 호는 &bull;)
const ITEM_RE = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// "~7/7" → YYYY-MM-DD. 연도는 KST 오늘 기준으로 추정 (연말 넘김 보정)
function parseDeadline(text: string, today: string): string | null {
  const m = text.match(/~\s*(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const year = Number(today.slice(0, 4));
  const pad = (n: string) => n.padStart(2, "0");
  let d = `${year}-${pad(m[1])}-${pad(m[2])}`;
  // 12월 호에 실린 1월 마감처럼 크게 과거로 계산되면 이듬해로 본다
  if (d < today) {
    const diffDays =
      (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${d}T00:00:00Z`).getTime()) / 86400000;
    if (diffDays > 60) d = `${year + 1}-${pad(m[1])}-${pad(m[2])}`;
  }
  return d;
}

// 섹션별 항목 형식이 다릅니다:
//   채용:   경력 | <b>조직</b> 제목 (~7/7)
//   그 외:  조직 | <b>제목</b> (~7/7)   — 행사는 뒤에 "@장소(지역)" 부가
function parseSection(block: string, category: Category, today: string): Item[] {
  const items: Item[] = [];
  for (const m of block.matchAll(ITEM_RE)) {
    const url = m[1];
    const inner = m[2];
    const bold = stripHtml((inner.match(/<b[^>]*>([\s\S]*?)<\/b>/) ?? [])[1] ?? "");
    const full = stripHtml(inner).replace(/new!?\s*$/i, "").trim();

    const deadline = parseDeadline(full, today);
    if (deadline && deadline < today) continue; // 마감 지난 항목 제외

    const bar = full.indexOf("|");
    const pre = bar > 0 ? full.slice(0, bar).trim() : null;
    const rest = (bar > 0 ? full.slice(bar + 1) : full)
      .replace(/\(?,?\s*~\s*\d{1,2}\/\d{1,2}\)?/, "")
      .trim();

    let title: string, source: string, extra: string | null;
    if (category === "job") {
      // pre=경력 구분, bold=조직, 제목=조직 뒤 나머지
      source = bold || pre || "오렌지레터";
      title = bold && rest.startsWith(bold) ? rest.slice(bold.length).trim() : rest;
      extra = pre;
    } else {
      source = pre || "오렌지레터";
      title = bold || rest;
      // 행사의 "@장소(지역)" → 부가정보. 마감일 제거로 괄호가 깨진 경우 보정
      const place = rest.match(/@\s*(.+)$/);
      extra = place ? place[1].replace(/\(\s*\)/, "").trim() : null;
      if (extra && extra.includes("(") && !extra.includes(")")) extra += ")";
    }
    if (!title) continue;

    items.push({
      id: urlToId(url),
      title,
      summary: null,
      source,
      url,
      category,
      extra,
      published_at: today, // 뉴스레터에 항목별 게시일이 없어 수집일 기록
      deadline,
    });
  }
  return items;
}

export async function fetchOrangeLetterItems(): Promise<Item[]> {
  try {
    // sitemap에서 가장 최신 호(가장 큰 /p/N)를 찾는다
    const sitemap = await fetchText(`${BASE}/sitemap.xml`);
    const ids = [...sitemap.matchAll(/\/p\/(\d+)\/?\s*<\/loc>/g)].map((m) => Number(m[1]));
    if (ids.length === 0) throw new Error("sitemap에서 호를 찾지 못함");
    const latest = Math.max(...ids);

    const html = await fetchText(`${BASE}/p/${latest}/`);
    const today = kstDateString();
    const seen = new Set<string>();
    const items: Item[] = [];

    for (const { marker, category } of SECTIONS) {
      const start = html.indexOf(marker);
      if (start < 0) continue;
      // 다음 🍊 섹션 헤더 전까지가 이 섹션의 블록
      const next = html.indexOf("🍊", start + marker.length);
      const block = html.slice(start, next > 0 ? next : undefined);
      for (const item of parseSection(block, category, today)) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        items.push(item);
      }
    }
    return items;
  } catch (e) {
    console.error("오렌지레터 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
