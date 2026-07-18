import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItems } from "@/lib/data";
import { kstDateString } from "@/lib/dates";
import HomeClient from "@/components/HomeClient";
import type { Category } from "@/lib/types";

// 카테고리별 실제 URL(/jobs, /grants …) — 검색엔진이 "소셜섹터 채용" 같은
// 키워드마다 전용 페이지를 색인할 수 있도록 합니다. 화면은 홈과 같고 해당 탭이 열린 상태.
export const revalidate = 3600;

const PAGES: Record<string, { cat: Category; title: string; desc: string }> = {
  news: {
    cat: "news",
    title: "소셜섹터 뉴스",
    desc: "비영리·사회적경제·복지 분야 오늘의 뉴스를 매일 여러 매체에서 모아 한 페이지로 보여드립니다.",
  },
  jobs: {
    cat: "job",
    title: "소셜섹터 채용",
    desc: "비영리단체·사회적기업·소셜벤처·재단의 채용 공고를 매일 모아 마감 임박한 순서로 보여드립니다.",
  },
  grants: {
    cat: "grant",
    title: "지원사업 공고",
    desc: "비영리·사회적경제 조직이 지원할 수 있는 정부·재단 지원사업 공고를 매일 모아 마감 임박한 순서로 보여드립니다.",
  },
  events: {
    cat: "event",
    title: "소셜섹터 모임·행사",
    desc: "시민 공론장, 포럼, 전시, 북토크 등 소셜섹터의 모임과 행사를 매일 모아 보여드립니다.",
  },
  education: {
    cat: "edu",
    title: "소셜섹터 교육",
    desc: "비영리 실무자와 활동가를 위한 교육·워크숍·프로그램을 매일 모아 마감 임박한 순서로 보여드립니다.",
  },
  library: {
    cat: "lib",
    title: "소셜섹터 자료실",
    desc: "연구보고서, 실태조사, AI 리포트 등 소셜섹터 실무에 도움이 되는 자료를 모아 보여드립니다.",
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((cat) => ({ cat }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const page = PAGES[cat];
  if (!page) return {};
  return {
    title: `${page.title} — 모아`,
    description: page.desc,
    alternates: { canonical: `/${cat}` },
    openGraph: { title: `${page.title} — 모아`, description: page.desc, url: `/${cat}` },
  };
}

export default async function CatPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  const page = PAGES[cat];
  if (!page) notFound();

  const { items, mode, headlineId } = await getItems();
  const today = kstDateString();
  return (
    <HomeClient
      items={items}
      today={today}
      mode={mode}
      headlineId={headlineId}
      initialCat={page.cat}
    />
  );
}
