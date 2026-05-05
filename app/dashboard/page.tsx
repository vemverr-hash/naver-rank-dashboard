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

  const getDailyRanks = (ranks: RankEntry[]) => {
    const daily: Record<string, RankEntry> = {};
    for (const r of ranks) {
      const dateKey = formatDate(r.checked_at);
      if (!daily[dateKey]) daily[dateKey] = r;
    }
    return Object.entries(daily).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-20 text-gray-400">
            <svg className="animate-spin h-6 w-6 mx-auto mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            데이터를 불러오는 중...
          </div>
        )}

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

        {!loading && data && data.sites.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><span className="text-3xl">📊</span></div>
            <p className="text-gray-500 mb-2">등록된 키워드가 없습니다</p>
            <Link href="/settings" className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm">키워드 등록하러 가기</Link>
          </div>
        )}

        {!loading && data && data.sites.length > 0 && (
          <div className="space-y-10">
            {data.sites.map((siteData) => (
              <section key={siteData.site}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-base font-semibold text-gray-800">{siteData.site}</h2>
                  <span className="text-xs text-gray-400">{siteData.keywords.length}개 키워드</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siteData.keywords.map((kw) => {
                    const dailyRanks = getDailyRanks(kw.ranks);
                    const change = getRankChange(kw.ranks);
                    return (
                      <div key={kw.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-semibold leading-tight text-gray-800">{kw.keyword}</h3>
                            {dailyRanks.length > 0 && <span className="text-[10px] text-gray-400">{formatFull(dailyRanks[0][1].checked_at)}</span>}
                          </div>
                          {change !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${change > 0 ? "bg-emerald-50 text-emerald-600" : change < 0 ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"}`}>
                              {change > 0 ? `▲${change}` : change < 0 ? `▼${Math.abs(change)}` : "−"}
                            </span>
                          )}
                        </div>
                        {dailyRanks.length > 0 ? (
                          <>
                            <div className="flex gap-1 mb-1.5">
                              {dailyRanks.map(([date]) => (<span key={date} className="flex-1 text-center text-[10px] text-gray-400">{date}</span>))}
                            </div>
                            <div className="flex gap-1">
                              {dailyRanks.map(([date, entry]) => (
                                <span key={date} className={`flex-1 text-center py-1.5 rounded-md text-xs border ${getRankStyle(entry.rank)}`}
                                  title={entry.rank ? `${entry.rank}위 - ${entry.title}` : "순위권 밖"}>
                                  {entry.rank ? `${entry.rank}위` : "—"}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-xs text-gray-400">아직 순위 데이터 없음</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {!loading && data && data.sites.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="inline-block w-7 text-center py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">3위</span>1~3위</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-7 text-center py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] border border-blue-200">7위</span>4~10위</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-7 text-center py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] border border-amber-200">25</span>21~30위</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-7 text-center py-0.5 rounded bg-red-50 text-red-600 text-[10px] border border-red-200">51</span>50위+</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500">▲</span>순위 상승</span>
              <span className="flex items-center gap-1.5"><span className="text-red-500">▼</span>순위 하락</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
