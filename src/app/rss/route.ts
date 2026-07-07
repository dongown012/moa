import { getItems } from "@/lib/data";
import { CAT_LABEL } from "@/lib/types";
import type { Category } from "@/lib/types";

// 모아 통합 RSS — 소셜섹터에 RSS를 제공하는 곳이 드물어, 모아가 모은 것을 다시 피드로 내보냅니다.
// 각 항목의 link는 원문입니다. 구독: https://moa-social.vercel.app/rss
export const revalidate = 3600;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function GET() {
  const { items } = await getItems();
  const latest = items
    .filter((i) => !i.url.includes("example.com")) // 목업 제외
    .slice(0, 50);

  const rssItems = latest
    .map((i) => {
      const cat = CAT_LABEL[i.category as Category] ?? i.category;
      return `    <item>
      <title>${esc(`[${cat}] ${i.title}`)}</title>
      <link>${esc(i.url)}</link>
      <guid isPermaLink="false">moa-${i.id}</guid>
      <description>${esc(i.summary ?? "")}</description>
      <category>${esc(cat)}</category>
      <source url="https://moa-social.vercel.app">${esc(i.source)}</source>
      <pubDate>${new Date(`${i.published_at}T09:00:00+09:00`).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>모아 — 소셜섹터 인덱스</title>
    <link>https://moa-social.vercel.app</link>
    <description>비영리·사회적경제 뉴스, 채용, 지원사업, 행사, 교육을 매일 한 페이지로.</description>
    <language>ko-kr</language>
    <ttl>60</ttl>
${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
