import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개 — 모아",
  description:
    "모아를 왜, 어떻게 만들었는가. 흩어진 소셜섹터 소식을 한 페이지로 모으는 데일리 인덱스의 편집 철학.",
};

export default function AboutPage() {
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

      <article className="about">
        <div className="wrap">
          <p className="about-kicker">ABOUT — 발행의 말</p>
          <h1>
            흩어진 소식을,
            <br />한 페이지로<i>.</i>
          </h1>

          <div className="about-body">
            <p className="about-lead">
              소셜섹터에서 일하는 사람이 하루를 시작하며 봐야 할 정보는 여기저기 흩어져
              있습니다. 전문 매체만 여남은 곳이고, 채용은 채용 플랫폼에, 지원사업 공고는 각
              재단과 정부 사이트에, 행사와 교육은 뉴스레터 구석에 있습니다. 그런데 이 동네에는
              RSS 문화조차 약해서, 구독기로 모아 보기도 어렵습니다.
            </p>

            <p>
              모아는 그 순회를 대신합니다. RSS가 있는 곳은 RSS로, 공공 API가 있는 곳은 API로,
              둘 다 없는 곳은 직접 읽어와서 — 매일 여러 번 수집해 마감이 임박한 것부터 보여주고,
              누르면 원문으로 보냅니다. 제목과 요약만 싣고 원문으로 연결하는 인덱스이므로,
              콘텐츠의 저작권은 언제나 각 출처에 있습니다.
            </p>

            <h2>일간지의 문법으로</h2>
            <p>
              화려한 카드형 피드 대신 <b>신문 지면</b>의 문법을 빌렸습니다. 아침에 한 번 길게
              훑고 닫는 매체라는 점에서, 소셜섹터 인덱스는 SNS보다 신문에 가깝기 때문입니다.
              날짜와 그날의 지표를 얹은 마스트헤드, 카테고리를 가로지르며 흐르는 마감 임박 스트립,
              이미지 없이 제목·요약·출처·마감일만 담은 텍스트 지면. 종이 흰색과 잉크 검정 위에
              단 하나의 파랑, 마감이 급할 때만 허락하는 빨강 — 색은 세 가지면 충분합니다.
            </p>

            <h2>넣은 매체보다, 뺀 매체가 색을 만든다</h2>
            <p>
              모아의 정체성은 무엇을 담느냐만큼 무엇을 <b>담지 않느냐</b>로 정해집니다. 기준은
              하나입니다 — <i>비영리·사회적경제 현장의 소식인가, 아니면 기업의 활동을
              다루는가.</i>
            </p>
            <p>
              그래서 여러 매체는 전체기사 대신 &lsquo;사회연대경제&rsquo;·&lsquo;공익&rsquo;
              같은 소셜섹터 섹션만 골라 구독해 지자체 행정·대기업 IR·사건사고를 걸러냅니다. ESG
              전문 매체처럼 &lsquo;기업이 어떻게 지속가능경영을 하는가&rsquo;의 시선으로 쓰인
              보도는, 방향이 반대라 넣지 않았습니다. 새 매체를 검토할 때는 실제 기사 제목을 뽑아
              필터를 시뮬레이션하고, 통과 수율과 그 품질이 모두 충분할 때만 더합니다.
            </p>

            <h2>어떻게 만들었나</h2>
            <p>
              모아는 Claude Code와의 협업으로 기획·개발·배포되었습니다. 데이터 수집부터
              디자인, 검색엔진 등록까지 전 과정이{" "}
              <a href="https://github.com/dongown012/moa" target="_blank" rel="noopener noreferrer">
                공개 저장소
              </a>
              에 열려 있습니다. 소셜섹터에 비슷한 것을 만들려는 분께, 코드보다 이 편집
              원칙이 더 도움이 되기를 바랍니다.
            </p>

            <p className="about-sign">
              오늘 볼 것, 여기 다 모아뒀습니다<span className="dot">.</span>
            </p>
          </div>

          <a href="/" className="about-cta">
            오늘의 인덱스 보기 →
          </a>
        </div>
      </article>

      <footer>
        <div className="wrap">
          <span>모아 — 제목·요약과 함께 원문으로 연결합니다. 콘텐츠 저작권은 각 출처에 있습니다.</span>
          <span>SOCIAL SECTOR · DAILY INDEX</span>
        </div>
      </footer>
    </>
  );
}
