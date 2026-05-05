"use client";

import { useState } from "react";

interface RankResult {
  site: string;
  rank: number | null;
  title: string;
  link: string;
}

interface SearchResult {
  keyword: string;
  results: RankResult[];
  totalSearched: number;
  searchedAt: string;
}

export default function DashboardPage() {
  const [keyword, setKeyword] = useState("");
  const [sites, setSites] = useState<string[]>([
    "cukiz.co.kr",
    "gooseisland.kr",
  ]);
  const [newSite, setNewSite] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");

  const addSite = () => {
    const domain = newSite.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (domain && !sites.includes(domain)) {
      setSites([...sites, domain]);
      setNewSite("");
    }
  };

  const removeSite = (site: string) => {
    setSites(sites.filter((s) => s !== site));
  };

  const checkRank = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/check-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), sites }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "검색 실패");
      }

      const data: SearchResult = await res.json();
      setResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 20));
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number | null) => {
    if (rank === null) return { text: "순위권 밖", color: "text-zinc-500", bg: "bg-zinc-800/50" };
    if (rank <= 3) return { text: `${rank}위`, color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (rank <= 10) return { text: `${rank}위`, color: "text-blue-400", bg: "bg-blue-500/10" };
    if (rank <= 30) return { text: `${rank}위`, color: "text-amber-400", bg: "bg-amber-500/10" };
    return { text: `${rank}위`, color: "text-orange-400", bg: "bg-orange-500/10" };
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-sm font-bold">N</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">네이버 순위 체커</h1>
          </div>
          <span className="text-xs text-zinc-600">naver-search-rank</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* 사이트 관리 */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">추적 사이트</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {sites.map((site) => (
              <span
                key={site}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-full text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {site}
                <button
                  onClick={() => removeSite(site)}
                  className="text-zinc-500 hover:text-red-400 transition-colors ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              placeholder="사이트 추가 (예: example.com)"
              className="flex-1 max-w-xs px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              onClick={addSite}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-lg text-sm transition-colors"
            >
              추가
            </button>
          </div>
        </section>

        {/* 키워드 검색 */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">키워드 검색</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkRank()}
              placeholder="검색할 키워드 입력..."
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-base placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <button
              onClick={checkRank}
              disabled={loading || !keyword.trim() || sites.length === 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-medium transition-colors"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  검색중
                </span>
              ) : (
                "순위 확인"
              )}
            </button>
          </div>
        </section>

        {/* 에러 */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-400">
                &quot;{result.keyword}&quot; 검색 결과
              </h2>
              <span className="text-xs text-zinc-600">
                상위 {result.totalSearched}개 검색 · {result.searchedAt}
              </span>
            </div>

            <div className="grid gap-3">
              {result.results.map((item) => {
                const badge = getRankBadge(item.rank);
                return (
                  <div
                    key={item.site}
                    className={`p-4 rounded-xl border transition-all ${
                      item.rank
                        ? "bg-zinc-900/60 border-zinc-800/60"
                        : "bg-zinc-900/30 border-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${badge.color} ${badge.bg}`}>
                          {badge.text}
                        </span>
                        <span className="text-sm font-medium">{item.site}</span>
                      </div>
                      {item.rank && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          링크 열기 →
                        </a>
                      )}
                    </div>
                    {item.rank && item.title && (
                      <p className="mt-2 text-xs text-zinc-500 pl-[76px]">
                        {item.title.replace(/<[^>]*>/g, "")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 검색 히스토리 */}
        {history.length > 1 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-3">최근 검색</h2>
            <div className="space-y-2">
              {history.slice(1).map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg text-sm"
                >
                  <span className="text-zinc-300">{h.keyword}</span>
                  <div className="flex gap-3">
                    {h.results.map((r) => (
                      <span key={r.site} className="text-xs text-zinc-500">
                        {r.site.split(".")[0]}:{" "}
                        <span className={getRankBadge(r.rank).color}>
                          {r.rank ? `${r.rank}위` : "-"}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 빈 상태 */}
        {!result && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">키워드를 입력하고 순위를 확인하세요</p>
            <p className="text-zinc-600 text-xs mt-1">네이버 웹검색 상위 100개 결과에서 내 사이트를 찾습니다</p>
          </div>
        )}
      </main>
    </div>
  );
}
