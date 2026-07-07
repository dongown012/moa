import Parser from "rss-parser";
import { FEEDS, type FeedDef } from "./feeds";
import type { Item } from "./types";
import { kstDateString } from "./dates";

// 언론사 서버가 기본 UA를 차단하는 경우가 있어 브라우저 UA를 흉내냅니다.
const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

// HTML 태그·엔티티 제거 후 한 줄 요약으로 정리
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const truncate = (s: string, max = 160) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

// URL을 FNV-1a 해시로 안정적인 숫자 id로 — 재수집해도 id가 같아 북마크가 유지됩니다.
export function urlToId(url: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function toKstDate(item: { isoDate?: string; pubDate?: string }, today: string): string {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) return today;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return today;
  const s = kstDateString(d);
  // 피드 타임존 오류로 미래 날짜가 오면 오늘로 보정
  return s > today ? today : s;
}

async function fetchFeed(feed: FeedDef, today: string): Promise<Item[]> {
  const parsed = await parser.parseURL(feed.feedUrl);
  return (parsed.items ?? [])
    .filter((it) => it.title && it.link)
    .slice(0, feed.limit ?? 12)
    .map((it) => {
      const summary = stripHtml(it.contentSnippet ?? it.content ?? it.summary ?? "");
      return {
        id: urlToId(it.link!),
        title: stripHtml(it.title!),
        summary: summary ? truncate(summary) : null,
        source: feed.name,
        url: it.link!,
        category: feed.category,
        extra: null,
        published_at: toKstDate(it, today),
        deadline: null,
      } satisfies Item;
    });
}

// 소스별 수집 건수 — 0건인 소스는 피드 장애/개편 신호입니다 (/api/collect 응답으로 확인)
export type CollectStats = Record<string, number>;

// 전체 피드를 병렬 수집 — 일부 피드가 죽어도 나머지는 살립니다.
export async function fetchRssItems(): Promise<{ items: Item[]; stats: CollectStats }> {
  const today = kstDateString();
  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f, today)));

  const stats: CollectStats = {};
  const seen = new Set<string>();
  const items: Item[] = [];
  results.forEach((r, i) => {
    const feed = FEEDS[i];
    const key = `${feed.name}/${feed.category}`;
    const got = r.status === "fulfilled" ? r.value.length : 0;
    stats[key] = (stats[key] ?? 0) + got; // 같은 매체 복수 피드는 합산
    if (r.status === "rejected") return;
    for (const item of r.value) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      items.push(item);
    }
  });
  items.sort((a, b) => b.published_at.localeCompare(a.published_at));
  return { items, stats };
}
