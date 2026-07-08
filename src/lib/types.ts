export type Category = "news" | "job" | "grant" | "event" | "edu" | "lib";

export interface Item {
  id: number;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  category: Category;
  extra: string | null;
  published_at: string; // YYYY-MM-DD
  deadline: string | null; // YYYY-MM-DD
}

export const CATS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "news", label: "뉴스" },
  { id: "job", label: "채용" },
  { id: "grant", label: "지원사업" },
  { id: "event", label: "모임·행사" },
  { id: "edu", label: "교육" },
  { id: "lib", label: "자료실" },
];

export const CAT_LABEL = Object.fromEntries(
  CATS.map((c) => [c.id, c.label])
) as Record<Category | "all", string>;
