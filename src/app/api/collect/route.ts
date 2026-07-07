import { collectAndStore } from "@/lib/data";

// 수집 소스 20곳을 병렬로 돌므로 기본 10초를 넘을 수 있음
export const maxDuration = 60;

// RSS·API·크롤러를 수집해 Postgres items에 저장하는 엔드포인트.
// DB 미설정 시에도 소스별 수집 통계를 반환해 모니터링 용도로 쓸 수 있습니다
// (stats에 0건인 소스 = 피드 장애/사이트 개편 신호).
// Vercel Cron이 GET + `Authorization: Bearer ${CRON_SECRET}` 헤더로 호출합니다.
// 로컬 테스트: curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/collect
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await collectAndStore();
    if (result.collected === 0) {
      return Response.json(result, { status: 502 });
    }
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
