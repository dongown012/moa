import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMonthItems } from "@/lib/data";
import { CATS, CAT_LABEL } from "@/lib/types";
import type { Category, Item } from "@/lib/types";

// 월별 아카이브 — 옛 콘텐츠가 검색엔진에 색인될 수 있는 유일한 통로.
// "2026년 7월 사회적기업 지원사업" 같은 시점형 검색의 진입점이 됩니다.
export const revalidate = 3600;

const monthLabel = (m: string) => `${m.slice(0, 4)}년 ${Number(m.slice(5))}월`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) return {};
  const label = monthLabel(month);
  return {
    title: `${label} 소셜섹터 아카이브 — 모아`,
    description: `${label}의 비영리·사회적경제 뉴스, 채용 공고, 지원사업, 모임·행사, 교육, 자료 기록. 모아가 수집한 그달의 소셜섹터 전체 소식입니다.`,
    alternates: { canonical: `/archive/${month}` },
  };
}

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();
  const items = await getMonthItems(month);
  if (items.length === 0) notFound();

  const label = monthLabel(month);
  const byCat = new Map<Category, Item[]>();
  for (const i of items) {
    if (!byCat.has(i.category)) byCat.set(i.category, []);
    byCat.get(i.category)!.push(i);
  }

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="/" className="logo">
            모아<i>.</i>
          </a>
          <a href="/archive" className="sub-link" style={{ marginLeft: "auto" }}>
            ← 아카이브
          </a>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <p className="page-kicker">ARCHIVE — {month}</p>
          <h1 className="page-title">{label}의 소셜섹터</h1>
          <p className="page-desc">
            {label}에 모아가 수집한 {items.length}건의 기록입니다. 마감된 공고도 참고용으로
            남겨둡니다. 제목을 누르면 원문으로 이동합니다.
          </p>

          {CATS.filter((c) => c.id !== "all" && byCat.has(c.id as Category)).map((c) => (
            <section key={c.id} className="arch-section">
              <h2>
                {c.label}
                <span className="cnt">{byCat.get(c.id as Category)!.length}</span>
              </h2>
              <ul className="arch-list">
                {byCat.get(c.id as Category)!.map((i) => (
                  <li key={i.id}>
                    <span className="arch-date">{i.published_at.slice(5)}</span>
                    <div>
                      <a href={i.url} target="_blank" rel="noopener noreferrer">
                        {i.title}
                      </a>
                      {i.summary && <p>{i.summary}</p>}
                      <small>{i.source}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <footer>
        <div className="wrap">
          <span>모아 — 제목·요약과 함께 원문으로 연결합니다. 콘텐츠 저작권은 각 출처에 있습니다.</span>
        </div>
      </footer>
    </>
  );
}
