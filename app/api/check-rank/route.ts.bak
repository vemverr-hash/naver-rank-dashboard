import { NextRequest, NextResponse } from "next/server";
// import { supabase } from "@/lib/supabase"; // (임시 주석 처리) DB 저장 로직은 나중에 필요하면 다시 연결합니다.
import { scrapeNaverSearch, findSiteRank } from "@/lib/naver-scraper";

export async function POST(req: NextRequest) {
  try {
    // 1. 프론트엔드(page.tsx)에서 보낸 데이터 받기
    const { keyword, sites } = await req.json();

    // 2. 데이터 유효성 검사
    if (!keyword || !sites || sites.length === 0) {
      return NextResponse.json(
        { error: "키워드와 최소 1개 이상의 사이트가 필요합니다." }, 
        { status: 400 }
      );
    }

    // 3. 네이버 실제 검색 결과 스크래핑 (키워드 1개당 1번만 수행하여 속도 최적화)
    const scrapeResults = await scrapeNaverSearch(keyword);

    // 4. 요청받은 여러 사이트들의 순위를 각각 찾기
    const results = sites.map((site: string) => {
      const found = findSiteRank(scrapeResults, site);
      return {
        site: site,
        rank: found.rank,
        title: found.title,
        link: found.link,
      };
    });

    const now = new Date().toISOString();

    // 5. 프론트엔드가 정확히 기대하는 포맷으로 결과 응답
    return NextResponse.json({
      keyword: keyword,
      results: results,
      totalSearched: scrapeResults.length,
      searchedAt: now,
    });

  } catch (err: any) {
    console.error("Check rank error:", err);
    return NextResponse.json(
      { error: err.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}