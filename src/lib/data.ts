import type { Item } from "./types";
import { ensureSchema, getDb } from "./db";
import { MOCK_ITEMS } from "./mock-data";
import { cleanSummary, fetchRssItems, type CollectStats } from "./rss";
import { fetchBizinfoGrants } from "./grants";
import { fetchImpactCareerJobs, fetchImpactCareerPrograms } from "./jobs";
import { fetchOrangeLetterItems } from "./orange";
import { fetchHiaiReports } from "./hiai";
import { fetchPartiTalks } from "./parti";
import { kstDayOffset } from "./dates";

// 같은 보도자료를 여러 매체가 그대로 싣는 경우가 있어 제목(기호·공백 제거)으로도 중복 제거
const normTitle = (t: string) => t.replace(/[^가-힣a-zA-Z0-9]/g, "");

// 전 소스를 한 번에 수집 — 페이지 렌더링과 /api/collect가 공유.
// stats의 0건 소스는 피드 장애/사이트 개편 신호입니다.
export async function collectLiveItems(): Promise<{ items: Item[]; stats: CollectStats }> {
  const [rss, grants, jobs, programs, orange, hiai, parti] = await Promise.all([
    fetchRssItems(),
    fetchBizinfoGrants(),
    fetchImpactCareerJobs(),
    fetchImpactCareerPrograms(),
    fetchOrangeLetterItems(),
    fetchHiaiReports(),
    fetchPartiTalks(),
  ]);
  const stats: CollectStats = {
    ...rss.stats,
    "기업마당/grant": grants.length,
    "임팩트닷커리어/job": jobs.length,
    "임팩트닷커리어/edu": programs.length,
    "오렌지레터/전섹션": orange.length,
    "홍익지능/lib": hiai.length,
    "빠띠시민대화/event": parti.length,
  };
  for (const [src, n] of Object.entries(stats)) {
    if (n === 0) console.warn(`[수집 경고] ${src}: 0건 — 피드 장애 또는 사이트 개편 가능성`);
  }

  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const items = [...rss.items, ...grants, ...jobs, ...programs, ...orange, ...hiai, ...parti].filter((i) => {
    const t = normTitle(i.title);
    if (seenUrl.has(i.url) || (t && seenTitle.has(t))) return false;
    seenUrl.add(i.url);
    seenTitle.add(t);
    return true;
  });
  return { items, stats };
}

// 수집 + DB 저장까지 한 번에 — /api/collect(Vercel Cron)와 홈 재생성 시 after()가 공유.
// 스키마는 최초 실행 때 자동 생성. DB 미설정이면 저장 없이 통계만 반환합니다.
export async function collectAndStore() {
  const { items, stats } = await collectLiveItems();
  const zeroSources = Object.entries(stats)
    .filter(([, n]) => n === 0)
    .map(([src]) => src);

  const sql = getDb();
  let upserted: number | null = null;
  if (sql && items.length > 0) {
    await ensureSchema(sql);
    // 관리자가 삭제(차단)한 URL은 다시 저장하지 않음
    const blocked = new Set((await sql`select url from blocked_urls`).map((r) => r.url as string));
    // id는 DB가 생성(identity)하므로 제외. url unique 충돌 시 기존 행 유지.
    const rows = items
      .filter((i) => !blocked.has(i.url))
      .map(({ id: _id, ...rest }) => rest);
    if (rows.length > 0) {
      const result = await sql`
        insert into items ${sql(rows, "title", "summary", "source", "url", "category", "extra", "published_at", "deadline")}
        on conflict (url) do nothing`;
      upserted = result.count;
    } else {
      upserted = 0;
    }
  }
  return { collected: items.length, upserted, stats, zeroSources };
}

// 마감일 없는 모임·행사는 무한정 남으므로 발행 60일이 지나면 숨깁니다 (db·live 공통)
function hideStaleEvents(items: Item[]): Item[] {
  const cutoff = kstDayOffset(-60);
  return items.filter(
    (i) => !(i.category === "event" && !i.deadline && i.published_at < cutoff)
  );
}

// 데이터 출처 3단계:
//   db   — Supabase 환경변수(.env.local)가 있으면 DB에서 조회
//   live — DB가 없으면 뉴스는 실시간 RSS로, 채용·지원사업 등 RSS 없는 카테고리는 목업으로 병합
//   mock — RSS까지 전부 실패하면 목업 전체
export type DataMode = "db" | "live" | "mock";

export async function getItems(): Promise<{
  items: Item[];
  mode: DataMode;
  headlineId?: number;
}> {
  const sql = getDb();
  if (sql) {
    try {
      const [rows, top] = await Promise.all([
        sql`
          select id::int as id, title, summary, source, url, category, extra,
                 to_char(published_at, 'YYYY-MM-DD') as published_at,
                 to_char(deadline, 'YYYY-MM-DD') as deadline
          from items
          order by published_at desc, id desc
          limit 300`,
        // 오늘의 헤드라인: 최근 이틀 뉴스 중 24시간 클릭 1위 (독자가 고른 기사)
        sql`
          select i.id::int as id
          from clicks c join items i on i.id = c.item_id
          where c.created_at > now() - interval '24 hours'
            and i.category = 'news'
            and i.published_at > current_date - 2
          group by i.id
          order by count(*) desc, i.id desc
          limit 1`.catch(() => []),
      ]);
      // 첫 수집 전(빈 테이블)에는 live로 폴백
      if (rows.length > 0) {
        // 요약 정리 개선 전에 저장된 행에도 바이라인 제거가 적용되도록 조회 시 한 번 더
        const items = (rows as unknown as Item[]).map((i) => ({
          ...i,
          summary: i.summary ? cleanSummary(i.summary) : null,
        }));
        return {
          items: hideStaleEvents(items),
          mode: "db",
          headlineId: (top[0]?.id as number) ?? undefined,
        };
      }
    } catch (e) {
      console.error("DB 조회 실패, RSS/목업으로 대체:", e instanceof Error ? e.message : e);
    }
  }

  const { items: liveItems } = await collectLiveItems();
  if (liveItems.length === 0) {
    return { items: MOCK_ITEMS, mode: "mock" };
  }

  // 실데이터가 없는 카테고리만 목업으로 채워 데모 완결성 유지
  const liveCats = new Set(liveItems.map((i) => i.category));
  const fillers = MOCK_ITEMS.filter((i) => !liveCats.has(i.category));
  return { items: hideStaleEvents([...liveItems, ...fillers]), mode: "live" };
}

const ITEM_COLS = (sql: NonNullable<ReturnType<typeof getDb>>) => sql`
  id::int as id, title, summary, source, url, category, extra,
  to_char(published_at, 'YYYY-MM-DD') as published_at,
  to_char(deadline, 'YYYY-MM-DD') as deadline`;

// 아카이브: 수집 이력이 있는 월 목록 (YYYY-MM, 최신순)
export async function getArchiveMonths(): Promise<string[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select distinct to_char(published_at, 'YYYY-MM') as m from items order by m desc`;
    return rows.map((r) => r.m as string);
  } catch {
    return [];
  }
}

// 아카이브: 해당 월의 전체 항목 (검색엔진이 색인할 수 있는 유일한 과거 기록)
export async function getMonthItems(month: string): Promise<Item[]> {
  const sql = getDb();
  if (!sql || !/^\d{4}-\d{2}$/.test(month)) return [];
  try {
    const rows = await sql`
      select ${ITEM_COLS(sql)} from items
      where to_char(published_at, 'YYYY-MM') = ${month}
      order by published_at desc, id desc`;
    return (rows as unknown as Item[]).map((i) => ({
      ...i,
      summary: i.summary ? cleanSummary(i.summary) : null,
    }));
  } catch {
    return [];
  }
}

// 모아 픽: 운영자가 골라둔 오래 남길 글 (최신 픽 순)
export async function getPicks(): Promise<(Item & { picked_at: string })[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select ${ITEM_COLS(sql)}, to_char(p.created_at, 'YYYY-MM-DD') as picked_at
      from picks p join items i on i.id = p.item_id
      order by p.created_at desc`;
    return (rows as unknown as (Item & { picked_at: string })[]).map((i) => ({
      ...i,
      summary: i.summary ? cleanSummary(i.summary) : null,
    }));
  } catch {
    return [];
  }
}
