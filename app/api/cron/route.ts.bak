import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { scrapeNaverSearch, findSiteRank } from "@/lib/naver-scraper";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // 보안: secret key 확인
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 등록된 모든 키워드 가져오기
  const { data: keywords, error } = await supabase
    .from("keywords")
    .select("*");

  if (error || !keywords) {
    return NextResponse.json(
      { error: "키워드 조회 실패" },
      { status: 500 }
    );
  }

  if (keywords.length === 0) {
    return NextResponse.json({ message: "등록된 키워드 없음", checked: 0 });
  }

  // 같은 키워드는 한 번만 검색
  const uniqueKeywords = [...new Set(keywords.map((k) => k.keyword))];
  const searchCache: Record<string, Awaited<ReturnType<typeof scrapeNaverSearch>>> = {};

  for (const kw of uniqueKeywords) {
    try {
      searchCache[kw] = await scrapeNaverSearch(kw);
    } catch (err) {
      console.error(`Scrape failed for "${kw}":`, err);
      searchCache[kw] = [];
    }
    // 차단 방지: 요청 사이 2초 대기
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 각 키워드+사이트 조합의 순위 저장
  const now = new Date().toISOString();
  const inserts = keywords.map((kw) => {
    const results = searchCache[kw.keyword] || [];
    const found = findSiteRank(results, kw.site);
    return {
      keyword_id: kw.id,
      rank: found.rank,
      title: found.title,
      link: found.link,
      checked_at: now,
    };
  });

  const { error: insertError } = await supabase.from("ranks").insert(inserts);

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json(
      { error: "순위 저장 실패: " + insertError.message },
      { status: 500 }
    );
  }

  // 결과 요약
  const summary = inserts.map((i) => {
    const kw = keywords.find((k) => k.id === i.keyword_id);
    return {
      site: kw?.site,
      keyword: kw?.keyword,
      rank: i.rank,
    };
  });

  return NextResponse.json({
    message: "순위 체크 완료",
    checked: inserts.length,
    time: now,
    results: summary,
  });
}
