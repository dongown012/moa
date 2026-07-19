import type { Metadata } from "next";
import { getPicks } from "@/lib/data";
import { CAT_LABEL } from "@/lib/types";

// 모아 픽 — 흘러가는 데일리 인덱스와 달리, 오래 남길 글을 운영자가 골라두는 큐레이션.
// 좋은 기획 기사, 인터뷰, 커리어 글이 여기에 쌓입니다. (/admin에서 픽)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "모아 픽 — 오래 남길 글들",
  description:
    "소셜섹터에서 일하는 사람이 두고두고 읽을 만한 글을 골라 모았습니다. 좋은 기획 기사, 인터뷰, 커리어와 성장에 관한 글들.",
  alternates: { canonical: "/picks" },
};

export default async function PicksPage() {
  const picks = await getPicks();

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
          <p className="page-kicker">MOA PICKS</p>
          <h1 className="page-title">
            오래 남길 글들<i>.</i>
          </h1>
          <p className="page-desc">
            뉴스는 흘러가지만 어떤 글은 남습니다. 소셜섹터에서 일하는 사람이 두고두고 읽을
            만한 기획, 인터뷰, 커리어 이야기를 골라 모았습니다.
          </p>

          {picks.length === 0 ? (
            <p className="page-desc">첫 픽을 고르고 있습니다 — 곧 채워질 거예요.</p>
          ) : (
            <div className="rows picks-rows">
              {picks.map((it) => (
                <article className="row" key={it.id}>
                  <span className="row-cat" data-cat={it.category}>
                    {CAT_LABEL[it.category]}
                  </span>
                  <div>
                    <h3>
                      <a href={it.url} target="_blank" rel="noopener noreferrer">
                        {it.title}
                      </a>
                    </h3>
                    {it.summary && <p>{it.summary}</p>}
                    <div className="row-meta">
                      <span className="src">{it.source}</span>
                      <span>{it.published_at}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
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
