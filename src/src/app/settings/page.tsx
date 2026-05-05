"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Keyword {
  id: number;
  site: string;
  keyword: string;
  created_at: string;
}

export default function SettingsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [site, setSite] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const res = await fetch("/api/keywords");
      const data = await res.json();
      if (Array.isArray(data)) setKeywords(data);
    } catch {
      setMessage({ text: "목록 불러오기 실패", type: "error" });
    }
  };

  const addKeyword = async () => {
    if (!site.trim() || !keyword.trim()) return;
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: site.trim(), keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKeyword("");
      setMessage({ text: "등록 완료!", type: "success" });
      fetchKeywords();
    } catch (err: any) {
      setMessage({ text: err.message || "등록 실패", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const deleteKeyword = async (id: number) => {
    if (!confirm("삭제하면 순위 기록도 함께 삭제됩니다. 계속하시겠습니까?")) return;

    try {
      const res = await fetch("/api/keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("삭제 실패");

      setMessage({ text: "삭제 완료", type: "success" });
      fetchKeywords();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const checkNow = async (id: number) => {
    setMessage({ text: "순위 확인 중...", type: "" });
    try {
      const res = await fetch("/api/check-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const rankText = data.rank ? `${data.rank}위` : "순위권 밖";
      setMessage({
        text: `[${data.keyword}] ${data.site} → ${rankText}`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  // 사이트별로 그룹핑
  const grouped: Record<string, Keyword[]> = {};
  keywords.forEach((kw) => {
    if (!grouped[kw.site]) grouped[kw.site] = [];
    grouped[kw.site].push(kw);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">⚙</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">키워드 설정</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← 대시보드
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* 메시지 */}
        {message.text && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "error"
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 키워드 등록 */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-4">
            새 키워드 등록
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="사이트 (예: cukiz.co.kr)"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="키워드 (예: 영종도 아파트 분양)"
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              <button
                onClick={addKeyword}
                disabled={loading || !site.trim() || !keyword.trim()}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
              >
                {loading ? "등록중..." : "등록"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            같은 사이트에 여러 키워드를 등록하려면 사이트는 그대로 두고 키워드만
            바꿔서 등록하세요.
          </p>
        </section>

        {/* 등록된 키워드 목록 */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-4">
            등록된 키워드 ({keywords.length}개)
          </h2>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              등록된 키워드가 없습니다. 위에서 추가해주세요.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([siteName, kws]) => (
                <div key={siteName}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-medium">{siteName}</span>
                    <span className="text-xs text-zinc-600">
                      ({kws.length}개 키워드)
                    </span>
                  </div>
                  <div className="space-y-2 pl-4">
                    {kws.map((kw) => (
                      <div
                        key={kw.id}
                        className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg"
                      >
                        <span className="text-sm">{kw.keyword}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => checkNow(kw.id)}
                            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                          >
                            지금 확인
                          </button>
                          <button
                            onClick={() => deleteKeyword(kw.id)}
                            className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
