"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Item, Category } from "@/lib/types";
import { CATS, CAT_LABEL, CAT_SLUG } from "@/lib/types";
import type { DataMode } from "@/lib/data";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const BATCH = 40; // 한 번에 화면에 그리는 항목 수 (데이터는 전체 보유, 렌더만 점진적)
const pad = (n: number) => String(n).padStart(2, "0");
// "YYYY-MM-DD"를 로컬 자정 기준 Date로 (타임존 밀림 방지)
const parseDate = (s: string) => new Date(`${s}T00:00:00`);

// live 모드에서 수집 실패한 카테고리는 목업(example.com)으로 채워지므로 실제 항목을 보고 판단
const modeNote = (mode: DataMode, items: Item[]) => {
  if (mode === "mock") return " (목업 데이터)";
  if (mode !== "live") return "";
  const hasFiller = items.some((i) => i.url.includes("example.com"));
  return hasFiller ? " (실시간 수집 · 일부 카테고리는 예시 데이터)" : " (실시간 수집)";
};

// 준비된 목록들에서 한 개씩 번갈아 뽑기
const rrLists = (lists: Item[][]): Item[] => {
  const queues = lists.map((l) => [...l]);
  const out: Item[] = [];
  for (let picked = true; picked; ) {
    picked = false;
    for (const q of queues) {
      const x = q.shift();
      if (x) {
        out.push(x);
        picked = true;
      }
    }
  }
  return out;
};

const bucketBy = <K,>(rows: Item[], keyOf: (i: Item) => K): Item[][] => {
  const buckets = new Map<K, Item[]>();
  for (const r of rows) {
    if (!buckets.has(keyOf(r))) buckets.set(keyOf(r), []);
    buckets.get(keyOf(r))!.push(r);
  }
  return [...buckets.values()];
};

// 카테고리 안 정렬: 마감 있는 것(임박순) → 상시(출처 번갈아) → 마감 지난 것
const arrangeByDeadline = (rows: Item[], today: string): Item[] => {
  const active = rows
    .filter((r) => r.deadline && r.deadline >= today)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const noDeadline = rrLists(bucketBy(rows.filter((r) => !r.deadline), (i) => i.source));
  const expired = rows.filter((r) => r.deadline && r.deadline < today);
  return [...active, ...noDeadline, ...expired];
};

// 같은 종류가 주르륵 이어지지 않도록 카테고리를 번갈아 배치하고,
// 각 카테고리 안은 '마감 임박 우선' 순서를 유지 (날짜 그룹 단위로 적용)
const interleave = (rows: Item[], today: string): Item[] =>
  rrLists(bucketBy(rows, (i) => i.category).map((l) => arrangeByDeadline(l, today)));

// 어떤 콘텐츠가 읽히는지 보기 위한 클릭 기록 (원문 이동은 막지 않음)
const trackClick = (id: number) => {
  try {
    navigator.sendBeacon(
      "/api/click",
      new Blob([JSON.stringify({ id })], { type: "application/json" })
    );
  } catch {}
};

export default function HomeClient({
  items,
  today,
  mode,
  headlineId,
  initialCat,
}: {
  items: Item[];
  today: string;
  mode: DataMode;
  headlineId?: number;
  initialCat?: Category;
}) {
  const [activeCat, setActiveCat] = useState<Category | "all">(initialCat ?? "all");
  const [query, setQuery] = useState("");
  const [nlMsg, setNlMsg] = useState("");
  const [nlBusy, setNlBusy] = useState(false);
  const [visible, setVisible] = useState(BATCH); // 현재 화면에 그리는 항목 수
  const [tickerPaused, setTickerPaused] = useState(false); // 마감 티커 정지(마우스·터치)
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 카테고리 딥링크: ?cat=job 으로 진입하면 해당 탭을 열고, 탭 전환 시 URL도 갱신
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    if (cat && CATS.some((c) => c.id === cat)) setActiveCat(cat as Category | "all");
  }, []);
  const switchCat = (cat: Category | "all") => {
    setActiveCat(cat);
    // 카테고리별 실제 경로(/jobs 등)로 URL 갱신 — 공유하면 그 탭이 열린 채로 색인·접속됨
    window.history.replaceState(null, "", cat === "all" ? "/" : `/${CAT_SLUG[cat]}`);
  };

  // 탭이 가로 스크롤 가능함을 알리는 우측 페이드 — 끝에 닿으면 숨김
  const tabsRef = useRef<HTMLElement | null>(null);
  const [tabsAtEnd, setTabsAtEnd] = useState(false);
  const updateTabsFade = () => {
    const el = tabsRef.current;
    if (!el) return;
    setTabsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };
  useEffect(() => {
    updateTabsFade();
    window.addEventListener("resize", updateTabsFade);
    return () => window.removeEventListener("resize", updateTabsFade);
  }, []);

  const subscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email");
    setNlBusy(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setNlMsg(data.message ?? "잠시 후 다시 시도해주세요.");
      if (data.ok) form.reset();
    } catch {
      setNlMsg("잠시 후 다시 시도해주세요.");
    } finally {
      setNlBusy(false);
    }
  };

  const dday = (dl: string) =>
    Math.ceil((parseDate(dl).getTime() - parseDate(today).getTime()) / 86400000);

  // 마스트헤드 통계
  const stats = useMemo(() => {
    const todayCnt = items.filter((i) => i.published_at === today).length;
    const weekDl = items.filter(
      (i) => i.deadline && dday(i.deadline) >= 0 && dday(i.deadline) <= 7
    ).length;
    const srcs = new Set(items.map((i) => i.source)).size;
    return { todayCnt, weekDl, srcs, total: items.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, today]);

  // 마감 스트립 (지원사업 포함 — 한 줄 정보는 모두에게 유용)
  const closingSoon = useMemo(
    () =>
      items
        .filter((i) => i.deadline && dday(i.deadline) >= 0)
        .sort((a, b) => dday(a.deadline!) - dday(b.deadline!))
        .slice(0, 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, today]
  );

  // 탭별 건수
  const countOf = (cat: Category | "all") =>
    cat === "all" ? items.length : items.filter((i) => i.category === cat).length;

  // 오늘의 헤드라인 — 신문 1면의 톱기사처럼 뉴스 1건을 크게.
  // 1순위: 최근 24시간 독자 클릭 1위(서버가 계산해 내려줌) / 폴백: 오늘자 최신 뉴스
  const headline = useMemo(() => {
    if (query.trim()) return null; // 검색 중에는 숨김
    const picked = headlineId ? items.find((i) => i.id === headlineId) : undefined;
    if (picked) return picked;
    const todayNews = items.filter(
      (i) => i.published_at === today && i.category === "news" && i.summary
    );
    return todayNews[0] ?? null;
  }, [items, today, query, headlineId]);
  const showHeadline = headline && activeCat === "all";

  // 필터링된 목록 → 날짜별 그룹 (그룹 안에서는 카테고리·출처 라운드로빈)
  const groups = useMemo(() => {
    let list =
      activeCat === "all" ? items : items.filter((i) => i.category === activeCat);
    const q = query.trim().toLowerCase();
    if (q)
      list = items.filter(
        (i) =>
          `${i.title}${i.summary ?? ""}${i.source}`.toLowerCase().includes(q) &&
          (activeCat === "all" || i.category === activeCat)
      );
    // 헤드라인으로 올린 항목은 목록에서 제외 (중복 방지)
    if (showHeadline) list = list.filter((i) => i.id !== headline.id);
    list = [...list].sort(
      (a, b) => parseDate(b.published_at).getTime() - parseDate(a.published_at).getTime()
    );
    const map = new Map<string, Item[]>();
    for (const i of list) {
      if (!map.has(i.published_at)) map.set(i.published_at, []);
      map.get(i.published_at)!.push(i);
    }
    return [...map.entries()].map(
      ([date, rows]) => [date, interleave(rows, today)] as const
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeCat, query, today, showHeadline, headline?.id]);

  // 탭 전환·검색 시 처음부터 다시 (점진 렌더 리셋)
  useEffect(() => setVisible(BATCH), [activeCat, query]);

  // 전체 데이터는 그대로 두고 화면에는 visible개까지만 그림 — 검색·필터는 전체 대상 유지
  const { visibleGroups, total } = useMemo(() => {
    const total = groups.reduce((s, [, rows]) => s + rows.length, 0);
    const out: (readonly [string, Item[]])[] = [];
    let remaining = visible;
    for (const [date, rows] of groups) {
      if (remaining <= 0) break;
      const take = rows.slice(0, remaining);
      out.push([date, take]);
      remaining -= take.length;
    }
    return { visibleGroups: out, total };
  }, [groups, visible]);
  const hasMore = visible < total;

  // 스크롤이 끝에 닿으면 다음 배치를 이어 그림 (추가 서버 요청 없음)
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setVisible((v) => v + BATCH),
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visibleGroups]);

  // 구독은 모달로 — 긴 피드를 지나 하단 밴드로 스크롤할 필요 없이 그 자리에서 신청.
  // (앵커 점프는 점진 렌더가 위에 삽입되며 위치가 밀리는 문제도 있었음)
  const [nlOpen, setNlOpen] = useState(false);
  const openNewsletter = (e: React.MouseEvent) => {
    e.preventDefault();
    setNlMsg("");
    setNlOpen(true);
  };
  useEffect(() => {
    if (!nlOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNlOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // 배경 스크롤 잠금
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [nlOpen]);

  const todayDate = parseDate(today);

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="#" className="logo">
            모아<i>.</i>
          </a>
          <div className="top-search">
            <input
              type="search"
              placeholder="조직, 키워드 검색"
              aria-label="검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <a href="#nl" className="sub-link" onClick={openNewsletter}>
            WEEKLY 구독
          </a>
        </div>
      </header>

      <section className="masthead">
        <div className="wrap">
          <p className="date-line">
            {todayDate.getFullYear()}.{pad(todayDate.getMonth() + 1)}.
            {pad(todayDate.getDate())} {DOW[todayDate.getDay()]}요일 — DAILY INDEX
          </p>
          <h1>
            오늘의 소셜섹터,
            <br />한 페이지로 <span className="accent">모아</span>봤습니다
          </h1>
          <div className="stats">
            <span>
              오늘 새 소식 <b>{stats.todayCnt}</b>
            </span>
            <span>
              이번 주 마감 <b>{stats.weekDl}</b>
            </span>
          </div>
        </div>
      </section>

      <div className="strip" aria-label="마감 임박">
        <div className="strip-inner">
          <span className="strip-label">CLOSING SOON</span>
          {/* 신문 전광판처럼 천천히 흐름 — 같은 목록을 두 벌 두어 끊김 없이 순환 */}
          <div
            className={`strip-track${tickerPaused ? " paused" : ""}`}
            onMouseEnter={() => setTickerPaused(true)}
            onMouseLeave={() => setTickerPaused(false)}
            onTouchStart={() => setTickerPaused(true)}
          >
            {[0, 1].map((seq) => (
              <div className="strip-seq" key={seq} aria-hidden={seq === 1}>
                {closingSoon.map((i) => {
                  const d = dday(i.deadline!);
                  return (
                    <a
                      key={i.id}
                      href={i.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={d <= 5 ? "urgent" : ""}
                      onClick={() => trackClick(i.id)}
                      tabIndex={seq === 1 ? -1 : undefined}
                    >
                      <b>D-{d}</b>
                      {i.title}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="wrap">
        <div className={`tabs-wrap${tabsAtEnd ? " at-end" : ""}`}>
          <nav className="tabs" aria-label="카테고리" ref={tabsRef} onScroll={updateTabsFade}>
            {CATS.map((c) => (
              <button
                key={c.id}
                className={`tab${c.id === activeCat ? " active" : ""}`}
                onClick={() => switchCat(c.id)}
              >
                {c.label}
                <span className="cnt">{countOf(c.id)}</span>
              </button>
            ))}
          </nav>
        </div>

        {showHeadline && (
          <article className="headline">
            <p className="headline-kicker">오늘의 헤드라인</p>
            <h2>
              <a
                href={headline.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick(headline.id)}
              >
                {headline.title}
              </a>
            </h2>
            {headline.summary && <p className="headline-summary">{headline.summary}</p>}
            <div className="row-meta">
              <span className="src">{headline.source}</span>
            </div>
          </article>
        )}

        <div className="feed">
          {groups.length === 0 ? (
            <div className="empty">
              &ldquo;{query}&rdquo;에 대한 결과가 없습니다.
              <span className="mono">NO RESULTS — 다른 키워드로 검색해 보세요</span>
            </div>
          ) : (
            visibleGroups.map(([date, rows]) => {
              const dt = parseDate(date);
              const isToday = date === today;
              return (
                <div className="date-group" key={date}>
                  <div className="date-head">
                    {pad(dt.getMonth() + 1)}.{pad(dt.getDate())} {DOW[dt.getDay()]}
                    <small>{isToday ? "TODAY" : ""}</small>
                  </div>
                  <div className="rows">
                    {rows.map((it) => {
                      const d = it.deadline ? dday(it.deadline) : null;
                      return (
                        <article className="row" key={it.id}>
                          <span className="row-cat" data-cat={it.category}>
                            {CAT_LABEL[it.category]}
                          </span>
                          <div>
                            <h3>
                              <a
                                href={it.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackClick(it.id)}
                              >
                                {it.title}
                              </a>
                            </h3>
                            {it.summary && <p>{it.summary}</p>}
                            <div className="row-meta">
                              <span className="src">{it.source}</span>
                              {it.extra && <span>{it.extra}</span>}
                              {d !== null && (
                                <span className={`dday ${d <= 5 ? "urgent" : ""}`}>
                                  {d >= 0 ? `마감 D-${d}` : "마감됨"}
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          {hasMore && (
            <div ref={sentinelRef} className="load-more" aria-hidden>
              더 불러오는 중…
            </div>
          )}
        </div>
      </main>

      <section className="nl" id="nl">
        <div className="wrap">
          <div>
            <h2>
              월요일 아침 한 통이면
              <br />이번 주 마감을 놓치지 않습니다<i>.</i>
            </h2>
            <p>NEWSLETTER — 지원사업 · 채용 · 행사 마감 요약, 매주 월 07:00 발송</p>
          </div>
          <form className="nl-form" onSubmit={subscribe}>
            <input
              type="email"
              name="email"
              required
              placeholder="이메일 주소"
              aria-label="이메일 주소"
            />
            <button type="submit" disabled={nlBusy}>
              {nlBusy ? "..." : "구독"}
            </button>
          </form>
        </div>
        {nlMsg && (
          <div className="wrap">
            <p role="status">{nlMsg}</p>
          </div>
        )}
      </section>

      <footer>
        <div className="wrap">
          <span>
            모아{modeNote(mode, items)} — 제목·요약과 함께 원문으로 연결합니다.
            콘텐츠 저작권은 각 출처에 있습니다.
          </span>
          <span className="mono">
            <a href="/picks">PICKS</a> · <a href="/archive">ARCHIVE</a> · SOURCES {stats.srcs}
          </span>
        </div>
      </footer>

      {nlOpen && (
        <div
          className="nl-modal-overlay"
          onClick={() => setNlOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="뉴스레터 구독"
        >
          <div className="nl-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="nl-modal-close"
              onClick={() => setNlOpen(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2>
              월요일 아침 한 통<i>.</i>
            </h2>
            <p>이번 주 마감할 지원사업·채용·행사를 요약해 매주 월요일 07:00에 보내드립니다.</p>
            <form className="nl-form" onSubmit={subscribe}>
              <input
                type="email"
                name="email"
                required
                placeholder="이메일 주소"
                aria-label="이메일 주소"
                autoFocus
              />
              <button type="submit" disabled={nlBusy}>
                {nlBusy ? "..." : "구독"}
              </button>
            </form>
            {nlMsg && (
              <p className="nl-modal-msg" role="status">
                {nlMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
