import { ensureSchema, getDb } from "@/lib/db";

// 콘텐츠 클릭 기록 (sendBeacon으로 호출). 실패해도 사용자 경험에 영향 없도록 조용히 처리.
let schemaReady = false;

export async function POST(request: Request) {
  const sql = getDb();
  if (!sql) return new Response(null, { status: 204 });

  try {
    const { id } = await request.json();
    if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 204 });
    if (!schemaReady) {
      await ensureSchema(sql);
      schemaReady = true;
    }
    await sql`insert into clicks (item_id) values (${id})`;
  } catch {}
  return new Response(null, { status: 204 });
}
