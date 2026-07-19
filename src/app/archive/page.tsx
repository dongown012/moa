import type { Metadata } from "next";
import { getArchiveMonths } from "@/lib/data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "아카이브 — 모아",
  description:
    "모아가 수집한 소셜섹터 뉴스·채용·지원사업·행사·교육·자료의 월별 아카이브. 지난 소식을 시점별로 다시 볼 수 있습니다.",
  alternates: { canonical: "/archive" },
};

const monthLabel = (m: string) => `${m.slice(0, 4)}년 ${Number(m.slice(5))}월`;

export default async function ArchivePage() {
  const months = await getArchiveMonths();

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="/" className="logo">
            모아<i>.</i>
          </a>
          <a href="/" className="sub-link" style={{ marginLeft: "auto" }}>
            ← 오늘의 인덱스
          </a>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <p className="page-kicker">ARCHIVE</p>
          <h1 className="page-title">월별 아카이브</h1>
          <p className="page-desc">
            모아가 수집한 모든 소식은 사라지지 않고 여기에 쌓입니다. 월을 선택해 지난
            소셜섹터의 기록을 살펴보세요.
          </p>
          {months.length === 0 ? (
            <p className="page-desc">아카이브를 준비하고 있습니다.</p>
          ) : (
            <ul className="arch-months">
              {months.map((m) => (
                <li key={m}>
                  <a href={`/archive/${m}`}>{monthLabel(m)}</a>
                </li>
              ))}
            </ul>
          )}
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
