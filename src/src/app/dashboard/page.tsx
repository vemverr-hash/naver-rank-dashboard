"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RankEntry {
  rank: number | null;
  checked_at: string;
  title: string;
}

interface KeywordData {
  id: number;
  keyword: string;
  ranks: RankEntry[];
}

interface SiteData {
  site: string;
  keywords: KeywordData[];
}

interface DashboardData {
  sites: SiteData[];
  totalKeywords: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ranks?days=${days}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message || "데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  // 순위별 뱃지 스타일
  const getRankStyle = (rank: number | null) => {
    if (rank === null) return "bg-zinc-800 text-zinc-500 border-zinc-700";
    if (rank <= 3) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold";
    if (rank <= 10) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    if (rank <= 20) return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    if (rank <= 30) return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    if (rank <= 50) return "bg-orange-500/10 text-orange-300 border-orange-500/20";
    return "bg-red-500/10 text-red-300 border-red-500/20";
  };

  // 날짜를 MM.DD 형식으로
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 시간을 HH:mm 형식으로
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // 날짜+시간 풀 포맷
  const formatFull = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  };

  // 키워드의 최신 순위 기록들을 날짜별로 그룹핑 (하루에 최신 1개만)
  const getDailyRanks = (ranks: RankEntry[]) => {
    const daily: Record<string, RankEntry> = {};
    // ranks는 이미 최신순 정렬
    for (const r of ranks) {
      const dateKey = formatDate(r.checked_at);
      if (!daily[dateKey]) {
        daily[dateKey] = r;
      }
    }
    // 날짜 역순 (최신 먼저)
    return Object.entries(daily)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);
  };

  // 순위 변동 계산
  const getRankChange = (ranks: RankEntry[]) => {
    const dailyRanks = getDailyRanks(ranks);
    if (dailyRanks.length < 2) return null;
    const latest = dailyRanks[0][1].rank;
    const prev = dailyRanks[1][1].rank;
    if (latest === null || prev === null) return null;
    return prev - latest; // 양수 = 순위 상승
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-sm font-bold">N</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              네이버 순위 대시보드
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* 기간 선택 */}
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-0.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    days === d
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              새로고침
            </button>
            <Link
              href="/settings"
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              ⚙ 설정
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-20 text-zinc-500">
            <svg
              className="animate-spin h-6 w-6 mx-auto mb-3"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            데이터를 불러오는 중...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && data && data.sites.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-zinc-400 mb-2">등록된 키워드가 없습니다</p>
            <Link
              href="/settings"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm transition-colors"
            >
              키워드 등록하러 가기
            </Link>
          </div>
        )}

        {!loading && data && data.sites.length > 0 && (
          <div className="space-y-10">
            {data.sites.map((siteData) => (
              <section key={siteData.site}>
                {/* 사이트 헤더 */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h2 className="text-base font-semibold">{siteData.site}</h2>
                  <span className="text-xs text-zinc-600">
                    {siteData.keywords.length}개 키워드
                  </span>
                </div>

                {/* 키워드 카드 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siteData.keywords.map((kw) => {
                    const dailyRanks = getDailyRanks(kw.ranks);
                    const change = getRankChange(kw.ranks);
                    const latestRank =
                      dailyRanks.length > 0
                        ? dailyRanks[0][1].rank
                        : null;

                    return (
                      <div
                        key={kw.id}
                        className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl"
                      >
                        {/* 키워드명 + 최신 체크 시간 */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-semibold leading-tight">
                              {kw.keyword}
                            </h3>
                            {dailyRanks.length > 0 && (
                              <span className="text-[10px] text-zinc-600">
                                {formatFull(dailyRanks[0][1].checked_at)}
                              </span>
                            )}
                          </div>
                          {change !== null && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                change > 0
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : change < 0
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {change > 0 ? `▲${change}` : change < 0 ? `▼${Math.abs(change)}` : "−"}
                            </span>
                          )}
                        </div>

                        {/* 날짜 헤더 */}
                        {dailyRanks.length > 0 ? (
                          <>
                            <div className="flex gap-1 mb-1.5">
                              {dailyRanks.map(([date]) => (
                                <span
                                  key={date}
                                  className="flex-1 text-center text-[10px] text-zinc-600"
                                >
                                  {date}
                                </span>
                              ))}
                            </div>

                            {/* 순위 뱃지들 */}
                            <div className="flex gap-1">
                              {dailyRanks.map(([date, entry]) => (
                                <span
                                  key={date}
                                  className={`flex-1 text-center py-1.5 rounded-md text-xs border ${getRankStyle(
                                    entry.rank
                                  )}`}
                                  title={
                                    entry.rank
                                      ? `${entry.rank}위 - ${entry.title}`
                                      : "순위권 밖"
                                  }
                                >
                                  {entry.rank ? `${entry.rank}위` : "—"}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-xs text-zinc-600">
                            아직 순위 데이터 없음
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 범례 */}
        {!loading && data && data.sites.length > 0 && (
          <div className="mt-10 pt-6 border-t border-zinc-800/40">
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 text-center py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px]">
                  3위
                </span>
                1~3위
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 text-center py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px]">
                  7위
                </span>
                4~10위
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 text-center py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px]">
                  25
                </span>
                21~30위
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 text-center py-0.5 rounded bg-red-500/10 text-red-300 text-[10px]">
                  51
                </span>
                50위+
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">▲</span> 순위 상승
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-red-400">▼</span> 순위 하락
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
