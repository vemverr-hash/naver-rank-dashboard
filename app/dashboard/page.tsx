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
  const [days, setDays] = useState(7); // 기본 7일

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

  const getRankStyle = (rank: number | null) => {
    if (rank === null) return "bg-gray-100 text-gray-400 border-gray-200";
    if (rank <= 3) return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
    if (rank <= 10) return "bg-blue-50 text-blue-700 border-blue-200";
    if (rank <= 20) return "bg-sky-50 text-sky-700 border-sky-200";
    if (rank <= 30) return "bg-amber-50 text-amber-700 border-amber-200";
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

  // 🚨 수정 포인트 1: .slice(0, 7)을 .slice(0, days)로 변경하여 선택한 기간만큼 보여줌
  const getDailyRanks = (ranks: RankEntry[]) => {
    const daily: Record<string, RankEntry> = {};
    // 날짜별로 가장 최신 순위 하나씩만 남기기
    const sortedRanks = [...ranks].sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
    
    for (const r of sortedRanks) {
      const dateKey = formatDate(r.checked_at);
      if (!daily[dateKey]) daily[dateKey] = r;
    }
    // 선택한 days만큼 자르기
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">네이버 순위 대시보드</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${days === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {d}일
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm">새로고침</button>
            <Link href="/settings" className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm">⚙ 설정</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && <div className="text-center py-20 text-gray-400">데이터를 불러오는 중...</div>}
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

        {!loading && data && data.sites.map((siteData) => (
          <section key={siteData.site} className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-semibold text-gray-800">{siteData.site}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {siteData.keywords.map((kw) => {
                const dailyRanks = getDailyRanks(kw.ranks);
                const change = getRankChange(kw.ranks);
                return (
                  <div key={kw.id} className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">{kw.keyword}</h3>
                        {dailyRanks.length > 0 && <span className="text-[10px] text-gray-400">{formatFull(dailyRanks[0][1].checked_at)}</span>}
                      </div>
                      {change !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${change > 0 ? "bg-emerald-50 text-emerald-600" : change < 0 ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"}`}>
                          {change > 0 ? `▲${change}` : change < 0 ? `▼${Math.abs(change)}` : "−"}
                        </span>
                      )}
                    </div>
                    {/* 🚨 수정 포인트 2: 가로 스크롤 가능하게 변경 (30일 치 데이터 대비) */}
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-1.5 min-w-max">
                        {dailyRanks.map(([date, entry]) => (
                          <div key={date} className="flex flex-col items-center gap-1 w-12">
                            <span className="text-[10px] text-gray-400">{date}</span>
                            <span className={`w-full text-center py-2 rounded-md text-[11px] border ${getRankStyle(entry.rank)}`} title={entry.title}>
                              {entry.rank ? `${entry.rank}` : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
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