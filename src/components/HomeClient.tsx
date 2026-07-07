"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, Category } from "@/lib/types";
import { CATS, CAT_LABEL, EXCLUDE_FROM_ALL } from "@/lib/types";
import type { DataMode } from "@/lib/data";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
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

// 같은 매체가 연속으로 나오지 않도록 날짜 그룹 안에서 출처를 라운드로빈으로 배치
const interleaveBySource = (rows: Item[]): Item[] => {
  const buckets = new Map<string, Item[]>();
  for (const r of rows) {
    if (!buckets.has(r.source)) buckets.set(r.source, []);
    buckets.get(r.source)!.push(r);
  }
  const lists = [...buckets.values()];
  const out: Item[] = [];
  for (let picked = true; picked; ) {
    picked = false;
    for (const l of lists) {
      const x = l.shift();
      if (x) {
        out.push(x);
        picked = true;
      }
    }
  }
  return out;
};

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
}: {
  items: Item[];
  today: string;
  mode: DataMode;
}) {
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [nlMsg, setNlMsg] = useState("");
  const [nlBusy, setNlBusy] = useState(false);

  // 카테고리 딥링크: ?cat=job 으로 진입하면 해당 탭을 열고, 탭 전환 시 URL도 갱신
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    if (cat && CATS.some((c) => c.id === cat)) setActiveCat(cat as Category | "all");
  }, []);
  const switchCat = (cat: Category | "all") => {
    setActiveCat(cat);
    const url = cat === "all" ? window.location.pathname : `?cat=${cat}`;
    window.history.replaceState(null, "", url);
  };

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
    cat === "all"
      ? items.filter((i) => !EXCLUDE_FROM_ALL.includes(i.category)).length
      : items.filter((i) => i.category === cat).length;

  // 필터링된 목록 → 날짜별 그룹 (그룹 안에서는 출처 라운드로빈)
  const groups = useMemo(() => {
    let list =
      activeCat === "all"
        ? items.filter((i) => !EXCLUDE_FROM_ALL.includes(i.category))
        : items.filter((i) => i.category === activeCat);
    const q = query.trim().toLowerCase();
    if (q)
      list = items.filter(
        (i) =>
          `${i.title}${i.summary ?? ""}${i.source}`.toLowerCase().includes(q) &&
          (activeCat === "all" || i.category === activeCat)
      );
    list = [...list].sort(
      (a, b) => parseDate(b.published_at).getTime() - parseDate(a.published_at).getTime()
    );
    const map = new Map<string, Item[]>();
    for (const i of list) {
      if (!map.has(i.published_at)) map.set(i.published_at, []);
      map.get(i.published_at)!.push(i);
    }
    return [...map.entries()].map(
      ([date, rows]) => [date, interleaveBySource(rows)] as const
    );
  }, [items, activeCat, query]);

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
          <a href="#nl" className="sub-link">
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
            <span>
              수집 출처 <b>{stats.srcs}</b>
            </span>
            <span>
              전체 <b>{stats.total}</b>건
            </span>
          </div>
        </div>
      </section>

      <div className="strip" aria-label="마감 임박">
        <div className="strip-inner">
          <span className="strip-label">CLOSING SOON</span>
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
              >
                <b>D-{d}</b>
                {i.title}
              </a>
            );
          })}
        </div>
      </div>

      <main className="wrap">
        <nav className="tabs" aria-label="카테고리">
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
        <p className="feed-note">
          {activeCat === "all"
            ? "지원사업 공고는 지원사업 탭에서 따로 모아 보실 수 있습니다."
            : " "}
        </p>

        <div className="feed">
          {groups.length === 0 ? (
            <div className="empty">
              &ldquo;{query}&rdquo;에 대한 결과가 없습니다.
              <span className="mono">NO RESULTS — 다른 키워드로 검색해 보세요</span>
            </div>
          ) : (
            groups.map(([date, rows]) => {
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
                          <span className="row-cat">{CAT_LABEL[it.category]}</span>
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
          <span>
            SOURCES {stats.srcs} · UPDATED DAILY
          </span>
        </div>
      </footer>
    </>
  );
}
