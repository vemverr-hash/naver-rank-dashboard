"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RankEntry { rank: number | null; checked_at: string; title: string; }
interface KeywordData { id: number; keyword: string; ranks: RankEntry[]; }
interface SiteData { site: string; keywords: KeywordData[]; }
interface DashboardData { sites: SiteData[]; totalKeywords: number; }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7); 

  useEffect(() => { fetchData(); }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ranks?days=${days}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) { setError(err.message || "데이터 로딩 실패"); }
    finally { setLoading(false); }
  };

  // 💡 컬러 테마 변경: 인디고 & 블루 톤으로 훨씬 세련되고 눈에 띄게!
  const getRankStyle = (rank: number | null) => {
    if (rank === null) return "bg-slate-50 text-slate-400 border-slate-100";
    if (rank <= 3) return "bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold shadow-sm";
    if (rank <= 10) return "bg-blue-50 text-blue-700 border-blue-200 font-bold";
    if (rank <= 20) return "bg-sky-50 text-sky-700 border-sky-200";
    if (rank <= 30) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (rank <= 50) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-red-50 text-red-600 border-red-200";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatFull = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  };

  const getDailyRanks = (ranks: RankEntry[]) => {
    const daily: Record<string, RankEntry> = {};
    const sortedRanks = [...ranks].sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
    
    for (const r of sortedRanks) {
      const dateKey = formatDate(r.checked_at);
      if (!daily[dateKey]) daily[dateKey] = r;
    }
    return Object.entries(daily).sort(([a], [b]) => b.localeCompare(a)).slice(0, days);
  };

  const getRankChange = (ranks: RankEntry[]) => {
    const dr = getDailyRanks(ranks);
    if (dr.length < 2) return null;
    const latest = dr[0][1].rank, prev = dr[1][1].rank;
    if (latest === null || prev === null) return null;
    return prev - latest;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white text-base font-black">N</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Rank Analytics</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${days === d ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {d}일
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors">새로고침</button>
            <Link href="/settings" className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors">⚙ 설정</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading && <div className="text-center py-20 text-slate-400 font-medium animate-pulse">데이터를 동기화 중입니다...</div>}
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

        {!loading && data && data.sites.map((siteData) => (
          <section key={siteData.site} className="mb-14">
            
            {/* 💡 사이트 주소 영역: 넓은 바(Bar) 형태로 변경하여 시인성 극대화 */}
            <div className="flex items-center gap-4 mb-6 bg-white py-4 px-6 border border-slate-200 rounded-2xl shadow-sm w-full">
              <div className="w-3 h-8 bg-indigo-600 rounded-full shadow-sm"></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{siteData.site}</h2>
              <span className="ml-auto text-xs font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
                추적 중인 키워드 {siteData.keywords.length}개
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {siteData.keywords.map((kw) => {
                const dailyRanks = getDailyRanks(kw.ranks);
                const change = getRankChange(kw.ranks);
                return (
                  // 💡 카드 디자인 고급화 & 호버 액션
                  <div key={kw.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                    
                    <div className="flex items-start justify-between mb-5 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">{kw.keyword}</h3>
                        {dailyRanks.length > 0 && <span className="text-xs text-slate-400 font-medium">최근 확인: {formatFull(dailyRanks[0][1].checked_at)}</span>}
                      </div>
                      {change !== null && (
                        <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${change > 0 ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : change < 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
                          {change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${Math.abs(change)}` : "−"}
                        </span>
                      )}
                    </div>
                    
                    {/* 💡 핵심 변경 포인트: 가로 스크롤 제거하고 7칸 그리드로 줄바꿈 처리! */}
                    <div className="grid grid-cols-7 gap-2">
                      {dailyRanks.map(([date, entry]) => (
                        <div key={date} className="flex flex-col items-center justify-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400">{date}</span>
                          <span className={`w-full text-center py-2 rounded-lg text-xs tracking-tight transition-colors border ${getRankStyle(entry.rank)}`} title={entry.title}>
                            {entry.rank ? entry.rank : "—"}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>
            
          </section>
        ))}
      </main>
    </div>
  );
}