import type { Item } from "./types";
import { stripHtml, truncate, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 홍익지능(hi-ai.kr) — 비영리·공익 분야 AI 리포트 사이트.
// 리포트가 WordPress 커스텀 포스트 타입(report)이라 일반 피드에는 안 나오고,
// REST API(/wp-json/wp/v2/report)로 가져옵니다.

interface WpPost {
  link?: string;
  date?: string; // 사이트 현지 시각 (KST)
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
}

export async function fetchHiaiReports(): Promise<Item[]> {
  try {
    const res = await fetch(
      "https://hi-ai.kr/wp-json/wp/v2/report?per_page=10&orderby=date&order=desc",
      {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows: WpPost[] = await res.json();

    const today = kstDateString();
    return rows
      .filter((r) => r.link && r.title?.rendered)
      .map((r) => {
        const summary = stripHtml(r.excerpt?.rendered ?? "");
        return {
          id: urlToId(r.link!),
          title: stripHtml(r.title!.rendered!),
          summary: summary ? truncate(summary) : null,
          source: "홍익지능",
          url: r.link!,
          category: "lib" as const,
          extra: "AI 리포트",
          published_at: r.date?.slice(0, 10) ?? today,
          deadline: null,
        };
      });
  } catch (e) {
    console.error("홍익지능 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
