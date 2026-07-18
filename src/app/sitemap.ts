import type { MetadataRoute } from "next";

const BASE = "https://moa-social.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    // 카테고리별 페이지 — 각 키워드("소셜섹터 채용" 등)로 색인되는 검색 진입점
    ...["news", "jobs", "grants", "events", "education", "library"].map((slug) => ({
      url: `${BASE}/${slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
