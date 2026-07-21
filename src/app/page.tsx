import { after } from "next/server";
import { collectAndStore, getItems, getPicksCount } from "@/lib/data";
import { kstDateString } from "@/lib/dates";
import HomeClient from "@/components/HomeClient";

// 1시간마다 재생성. DB 모드에서는 재생성이 끝난 뒤 백그라운드로 새로 수집해 저장하므로
// (아래 after), 방문이 이어지는 한 데이터도 시간 단위로 갱신됩니다.
// 방문이 없는 날은 Vercel Cron(하루 1회, vercel.json)이 수집을 보장합니다.
export const revalidate = 3600;

export default async function Home() {
  const [{ items, mode, headlineId }, picksCount] = await Promise.all([
    getItems(),
    getPicksCount(),
  ]);
  if (mode === "db") {
    after(async () => {
      try {
        const { upserted } = await collectAndStore();
        console.log(`[백그라운드 수집] 신규 ${upserted ?? 0}건 저장`);
      } catch (e) {
        console.error("[백그라운드 수집 실패]", e instanceof Error ? e.message : e);
      }
    });
  }
  const today = kstDateString();
  return (
    <HomeClient
      items={items}
      today={today}
      mode={mode}
      headlineId={headlineId}
      picksCount={picksCount}
    />
  );
}
