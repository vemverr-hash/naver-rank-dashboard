"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Keyword { id: number; site: string; keyword: string; created_at: string; }

export default function SettingsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [site, setSite] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => { fetchKeywords(); }, []);

  const fetchKeywords = async () => {
    try {
      const res = await fetch("/api/keywords");
      const data = await res.json();
      if (Array.isArray(data)) setKeywords(data);
    } catch { setMessage({ text: "목록 불러오기 실패", type: "error" }); }
  };

  const addKeyword = async () => {
    if (!site.trim() || !keyword.trim()) return;
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/keywords", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: site.trim(), keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeyword("");
      setMessage({ text: "등록 완료!", type: "success" });
      fetchKeywords();
    } catch (err: any) { setMessage({ text: err.message || "등록 실패", type: "error" }); }
    finally { setLoading(false); }
  };

  const deleteKeyword = async (id: number) => {
    if (!confirm("삭제하면 순위 기록도 함께 삭제됩니다. 계속하시겠습니까?")) return;
    try {
      const res = await fetch("/api/keywords", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      setMessage({ text: "삭제 완료", type: "success" });
      fetchKeywords();
    } catch (err: any) { setMessage({ text: err.message, type: "error" }); }
  };

  const checkNow = async (id: number) => {
    setMessage({ text: "순위 확인 중...", type: "" });
    try {
      const res = await fetch("/api/check-rank", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const rankText = data.rank ? `${data.rank}위` : "순위권 밖";
      setMessage({ text: `[${data.keyword}] ${data.site} → ${rankText}`, type: "success" });
    } catch (err: any) { setMessage({ text: err.message, type: "error" }); }
  };

  const grouped: Record<string, Keyword[]> = {};
  keywords.forEach((kw) => { if (!grouped[kw.site]) grouped[kw.site] = []; grouped[kw.site].push(kw); });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">⚙</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">키워드 설정</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← 대시보드</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === "error" ? "bg-red-50 border border-red-200 text-red-600"
            : message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
            : "bg-gray-50 border border-gray-200 text-gray-600"}`}>
            {message.text}
          </div>
        )}

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-4">새 키워드 등록</h2>
          <div className="space-y-3">
            <input type="text" value={site} onChange={(e) => setSite(e.target.value)}
              placeholder="사이트 (예: cukiz.co.kr)"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-all shadow-sm" />
            <div className="flex gap-2">
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="키워드 (예: 영종도 아파트 분양)"
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-all shadow-sm" />
              <button onClick={addKeyword} disabled={loading || !site.trim() || !keyword.trim()}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap shadow-sm">
                {loading ? "등록중..." : "등록"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">같은 사이트에 여러 키워드를 등록하려면 사이트는 그대로 두고 키워드만 바꿔서 등록하세요.</p>
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-4">등록된 키워드 ({keywords.length}개)</h2>
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">등록된 키워드가 없습니다. 위에서 추가해주세요.</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([siteName, kws]) => (
                <div key={siteName}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-gray-700">{siteName}</span>
                    <span className="text-xs text-gray-400">({kws.length}개 키워드)</span>
                  </div>
                  <div className="space-y-2 pl-4">
                    {kws.map((kw) => (
                      <div key={kw.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <span className="text-sm text-gray-700">{kw.keyword}</span>
                        <div className="flex gap-2">
                          <button onClick={() => checkNow(kw.id)}
                            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-md transition-colors">지금 확인</button>
                          <button onClick={() => deleteKeyword(kw.id)}
                            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors">삭제</button>
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
