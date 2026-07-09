import type { Item } from "./types";
import { stripHtml, truncate, urlToId } from "./rss";
import { kstDateString } from "./dates";

// 빠띠 시민대화(talks.campaigns.do)의 '모임' 게시판 — 시민들이 모이는 실제 자리(토론회·대화·워크숍).
// 목록(/boards/meeting)은 Turbo로 게시글을 지연 로딩해 제목이 비어 있으므로,
// 목록에서 게시글 ID만 뽑고 각 게시글의 og:title·og:description을 개별로 가져옵니다.
// 발행일을 안정적으로 얻기 어려워 수집일로 기록하고, 오래된 것은 발행 60일 후 자동 숨김에 맡깁니다.

const LIST_URL = "https://talks.campaigns.do/boards/meeting?page=1";
const BASE = "https://talks.campaigns.do";
const LIMIT = 10;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const meta = (html: string, prop: string) =>
  (html.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`)) ?? [])[1] ?? "";

async function fetchPost(id: string, today: string): Promise<Item | null> {
  try {
    const url = `${BASE}/posts/${id}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = await res.text();
    const title = stripHtml(meta(html, "og:title"));
    if (title.length < 4) return null;
    const desc = stripHtml(meta(html, "og:description"));
    return {
      id: urlToId(url),
      title: truncate(title, 70),
      summary: desc ? truncate(desc, 90) : null,
      source: "빠띠 시민대화",
      url,
      category: "event",
      extra: "시민 모임",
      published_at: today, // 게시글 발행일을 안정적으로 못 얻어 수집일로 기록
      deadline: null,
    };
  } catch {
    return null;
  }
}

export async function fetchPartiTalks(): Promise<Item[]> {
  try {
    const res = await fetch(LIST_URL, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // 게시글 카드는 <turbo-frame id="col-x-post-grid_post_ID">로 감싸져 ID만 노출됨
    const ids = [
      ...new Set([...html.matchAll(/col-x-post-grid_post_([A-Za-z0-9]+)/g)].map((m) => m[1])),
    ].slice(0, LIMIT);
    if (ids.length === 0) throw new Error("모임 게시글 ID를 찾지 못함");

    const today = kstDateString();
    const results = await Promise.all(ids.map((id) => fetchPost(id, today)));
    return results.filter((i): i is Item => i !== null);
  } catch (e) {
    console.error("빠띠 시민대화 수집 실패:", e instanceof Error ? e.message : e);
    return [];
  }
}
