import type { MetadataRoute } from "next";
import { getArchiveMonths } from "@/lib/data";

const BASE = "https://moa-social.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const months = await getArchiveMonths();
  return [
    { url: BASE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    // 카테고리별 페이지 — 각 키워드("소셜섹터 채용" 등)로 색인되는 검색 진입점
    ...["news", "jobs", "grants", "events", "education", "library"].map((slug) => ({
      url: `${BASE}/${slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    { url: `${BASE}/picks`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/archive`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    // 월별 아카이브 — 매달 늘어나는 색인 표면적 (시점형 검색의 진입점)
    ...months.map((m) => ({
      url: `${BASE}/archive/${m}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
