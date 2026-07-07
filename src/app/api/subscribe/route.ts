import { ensureSchema, getDb } from "@/lib/db";

// WEEKLY 뉴스레터 구독 신청. 발송 기능이 생기기 전까지는 이메일만 안전하게 모아둡니다.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let schemaReady = false;

export async function POST(request: Request) {
  const sql = getDb();
  if (!sql) {
    return Response.json({ ok: false, message: "구독 기능은 준비 중입니다." }, { status: 503 });
  }

  try {
    const { email } = await request.json();
    if (typeof email !== "string" || email.length > 200 || !EMAIL_RE.test(email.trim())) {
      return Response.json({ ok: false, message: "이메일 주소를 확인해주세요." }, { status: 400 });
    }
    if (!schemaReady) {
      await ensureSchema(sql);
      schemaReady = true;
    }
    const result = await sql`
      insert into subscribers (email) values (${email.trim().toLowerCase()})
      on conflict (email) do nothing`;
    return Response.json({
      ok: true,
      message:
        result.count > 0
          ? "구독 신청 완료! 첫 호가 준비되면 보내드릴게요."
          : "이미 구독 중인 주소예요 — 감사합니다!",
    });
  } catch {
    return Response.json({ ok: false, message: "잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
