import { revalidatePath } from "next/cache";
import { collectLiveItems } from "@/lib/data";
import { getDb } from "@/lib/db";

// 수집 데이터 관리 페이지 — /admin?key=ADMIN_SECRET 으로 접근.
// DB 연결 시: 소스별 현황 + 최근 항목 목록 + 삭제. 미연결 시: 실시간 수집 통계만.

async function deleteItem(formData: FormData) {
  "use server";
  const secret = process.env.ADMIN_SECRET;
  if (!secret || formData.get("key") !== secret) return;
  const id = Number(formData.get("id"));
  const sql = getDb();
  if (!sql || !Number.isInteger(id)) return;
  // URL을 차단 목록에 남겨 다음 수집 때 다시 들어오지 않게 함
  await sql`insert into blocked_urls (url)
            select url from items where id = ${id}
            on conflict (url) do nothing`;
  await sql`delete from items where id = ${id}`;
  revalidatePath("/admin");
  revalidatePath("/");
}

// 모아 픽 토글 — 좋은 글을 /picks 큐레이션에 올리거나 내림
async function togglePick(formData: FormData) {
  "use server";
  const secret = process.env.ADMIN_SECRET;
  if (!secret || formData.get("key") !== secret) return;
  const id = Number(formData.get("id"));
  const sql = getDb();
  if (!sql || !Number.isInteger(id)) return;
  if (formData.get("picked") === "1") {
    await sql`delete from picks where item_id = ${id}`;
  } else {
    await sql`insert into picks (item_id) values (${id}) on conflict (item_id) do nothing`;
  }
  revalidatePath("/admin");
  revalidatePath("/picks");
}

// URL로 픽 — 최근 60건에 없어도, 검색·아카이브·클릭 순위 어디서 찾은 기사든 원문 URL로 픽
async function pickByUrl(formData: FormData) {
  "use server";
  const secret = process.env.ADMIN_SECRET;
  if (!secret || formData.get("key") !== secret) return;
  const url = String(formData.get("url") ?? "").trim();
  const sql = getDb();
  if (!sql || !url) return;
  await sql`
    insert into picks (item_id)
    select id from items where url = ${url}
    on conflict (item_id) do nothing`;
  revalidatePath("/admin");
  revalidatePath("/picks");
}

const box: React.CSSProperties = {
  maxWidth: 960,
  margin: "40px auto",
  padding: "0 20px",
  fontFamily: "monospace",
  fontSize: 13,
};
const th: React.CSSProperties = { textAlign: "left", borderBottom: "2px solid #141414", padding: "6px 8px" };
const td: React.CSSProperties = { borderBottom: "1px solid #ddd", padding: "6px 8px", verticalAlign: "top" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_SECRET;
  if (!secret || key !== secret) {
    return (
      <main style={box}>
        <h1>모아 관리</h1>
        <p>접근 권한이 없습니다. <code>/admin?key=…</code> 형식으로 접속하세요.</p>
      </main>
    );
  }

  const sql = getDb();

  if (!sql) {
    // DB 미연결 — 실시간 수집 통계만 보여줌
    const { items, stats } = await collectLiveItems();
    return (
      <main style={box}>
        <h1>모아 관리 <small>(DB 미연결 — 실시간 수집 통계)</small></h1>
        <p>총 {items.length}건 수집. DB 연결(DATABASE_URL) 후에는 저장된 항목 관리가 가능합니다.</p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>소스</th><th style={th}>수집 건수</th></tr></thead>
          <tbody>
            {Object.entries(stats).map(([src, n]) => (
              <tr key={src}>
                <td style={td}>{src}</td>
                <td style={{ ...td, color: n === 0 ? "#c00" : undefined }}>
                  {n}{n === 0 ? " ⚠ 장애/개편 의심" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    );
  }

  const [totals, recent, topClicks, dailyClicks, subscribers] = await Promise.all([
    sql`select source, count(*)::int as cnt, max(created_at)::date::text as last
        from items group by source order by cnt desc`,
    sql`select i.id::int as id, i.title, i.source, i.category,
               to_char(i.published_at, 'YYYY-MM-DD') as published_at, i.url,
               (p.item_id is not null) as picked
        from items i left join picks p on p.item_id = i.id
        order by i.id desc limit 60`,
    // 최근 7일 인기 클릭 콘텐츠 (여기서 바로 픽할 수 있도록 id·픽 여부 포함)
    sql`select i.id::int as id, i.title, i.source, i.category, count(c.*)::int as clicks,
               (pk.item_id is not null) as picked
        from clicks c join items i on i.id = c.item_id
        left join picks pk on pk.item_id = i.id
        where c.created_at > now() - interval '7 days'
        group by i.id, i.title, i.source, i.category, pk.item_id
        order by clicks desc limit 15`.catch(() => []),
    // 최근 7일 일별 클릭 추이
    sql`select to_char(created_at at time zone 'Asia/Seoul', 'MM-DD') as day, count(*)::int as clicks
        from clicks where created_at > now() - interval '7 days'
        group by day order by day desc`.catch(() => []),
    sql`select email, created_at::date::text as at from subscribers
        order by id desc limit 20`.catch(() => []),
  ]);
  const total = totals.reduce((s, r) => s + (r.cnt as number), 0);
  const weekClicks = dailyClicks.reduce((s, r) => s + (r.clicks as number), 0);

  return (
    <main style={box}>
      <h1>모아 관리</h1>
      <p>저장된 항목 {total}건 · 출처 {totals.length}곳</p>

      <h2>출처별 현황</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 32 }}>
        <thead><tr><th style={th}>출처</th><th style={th}>건수</th><th style={th}>마지막 수집</th></tr></thead>
        <tbody>
          {totals.map((r) => (
            <tr key={r.source as string}>
              <td style={td}>{r.source as string}</td>
              <td style={td}>{r.cnt as number}</td>
              <td style={td}>{r.last as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>최근 7일 클릭 {weekClicks}건</h2>
      <p style={{ color: "#888", margin: "4px 0 12px" }}>
        일별: {dailyClicks.length === 0
          ? "아직 없음"
          : dailyClicks.map((r) => `${r.day}(${r.clicks})`).join(" · ")}
        {" — "}방문·유입경로는 Vercel 대시보드 → Analytics 탭 참고
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
        <thead>
          <tr><th style={th}>클릭</th><th style={th}>분류</th><th style={th}>제목</th><th style={th}>출처</th><th style={th}></th></tr>
        </thead>
        <tbody>
          {topClicks.length === 0 ? (
            <tr><td style={td} colSpan={5}>아직 클릭 기록이 없습니다</td></tr>
          ) : (
            topClicks.map((r) => (
              <tr key={r.id as number}>
                <td style={td}>{r.clicks as number}</td>
                <td style={td}>{r.category as string}</td>
                <td style={td}>{r.title as string}</td>
                <td style={td}>{r.source as string}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <form action={togglePick}>
                    <input type="hidden" name="id" value={r.id as number} />
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="picked" value={r.picked ? "1" : "0"} />
                    <button type="submit" style={r.picked ? { color: "#1D40C8", fontWeight: 700 } : undefined}>
                      {r.picked ? "★픽됨" : "☆픽"}
                    </button>
                  </form>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <form action={pickByUrl} style={{ marginBottom: 32, display: "flex", gap: 6 }}>
        <input type="hidden" name="key" value={key} />
        <input
          type="url"
          name="url"
          required
          placeholder="원문 URL을 붙여넣어 픽 (검색·아카이브·목록 어디서든)"
          style={{ flex: 1, padding: "6px 8px", border: "1px solid #ccc", fontFamily: "monospace", fontSize: 12 }}
        />
        <button type="submit">URL로 픽</button>
      </form>

      <h2>뉴스레터 구독 신청 (최근 20)</h2>
      <p style={{ color: "#888", margin: "4px 0 12px" }}>
        {subscribers.length === 0
          ? "아직 신청이 없습니다"
          : subscribers.map((r) => `${r.email as string} (${r.at as string})`).join(" · ")}
      </p>

      <h2>최근 항목 60건</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr><th style={th}>날짜</th><th style={th}>분류</th><th style={th}>제목</th><th style={th}>출처</th><th style={th}></th></tr>
        </thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.id as number}>
              <td style={td}>{r.published_at as string}</td>
              <td style={td}>{r.category as string}</td>
              <td style={td}>
                <a href={r.url as string} target="_blank" rel="noopener noreferrer">
                  {r.title as string}
                </a>
              </td>
              <td style={td}>{r.source as string}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                <form action={togglePick} style={{ display: "inline-block", marginRight: 6 }}>
                  <input type="hidden" name="id" value={r.id as number} />
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="picked" value={r.picked ? "1" : "0"} />
                  <button type="submit" style={r.picked ? { color: "#1D40C8", fontWeight: 700 } : undefined}>
                    {r.picked ? "★픽됨" : "☆픽"}
                  </button>
                </form>
                <form action={deleteItem} style={{ display: "inline-block" }}>
                  <input type="hidden" name="id" value={r.id as number} />
                  <input type="hidden" name="key" value={key} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
