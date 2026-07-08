import postgres from "postgres";

// Vercel Postgres(Neon) 연결. Vercel이 주입하는 DATABASE_URL/POSTGRES_URL을 사용하고,
// 없으면 null을 반환해 실시간 수집(live) 모드로 동작합니다.
// DB는 서버에서만 접근하므로 공개 읽기 권한(RLS) 설정이 필요 없습니다.

let client: ReturnType<typeof postgres> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) return null;
  // 서버리스 환경: 커넥션 1개, Neon 풀러(pgbouncer)는 prepared statement 미지원
  client ??= postgres(url, { max: 1, prepare: false });
  return client;
}

// 스키마는 수집기가 최초 실행 때 스스로 만듭니다 — SQL 에디터에서 손으로 실행할 것 없음.
export async function ensureSchema(sql: NonNullable<ReturnType<typeof getDb>>) {
  await sql`
    create table if not exists items (
      id           bigint generated always as identity primary key,
      title        text not null,
      summary      text,
      source       text not null,
      url          text not null unique,
      category     text not null check (category in ('news','job','grant','event','edu','lib')),
      extra        text,
      published_at date not null default current_date,
      deadline     date,
      created_at   timestamptz not null default now()
    )`;
  await sql`create index if not exists items_published_at_idx on items (published_at desc)`;
  await sql`create index if not exists items_deadline_idx on items (deadline) where deadline is not null`;
  await sql`create index if not exists items_category_idx on items (category, published_at desc)`;
  // 콘텐츠 클릭 기록 — 어떤 항목이 읽히는지 /admin에서 집계
  await sql`
    create table if not exists clicks (
      id         bigint generated always as identity primary key,
      item_id    bigint not null,
      created_at timestamptz not null default now()
    )`;
  await sql`create index if not exists clicks_item_idx on clicks (item_id)`;
  await sql`create index if not exists clicks_created_idx on clicks (created_at desc)`;
  // WEEKLY 뉴스레터 구독 이메일 — 발송 기능 전이라도 주소는 지금부터 모읍니다
  await sql`
    create table if not exists subscribers (
      id         bigint generated always as identity primary key,
      email      text not null unique,
      created_at timestamptz not null default now()
    )`;
  // /admin에서 삭제한 항목의 URL — 다음 수집 때 다시 들어오지 않도록 영구 차단
  await sql`
    create table if not exists blocked_urls (
      url        text primary key,
      created_at timestamptz not null default now()
    )`;
}
