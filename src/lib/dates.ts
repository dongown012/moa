// 한국 서비스이므로 날짜는 항상 KST 기준 YYYY-MM-DD로 다룹니다.
export const kstDateString = (d: Date = new Date()) =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

export const kstDayOffset = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return kstDateString(d);
};
