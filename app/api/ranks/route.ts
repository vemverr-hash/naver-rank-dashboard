import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") || "7");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // 키워드 정보와 순위 기록을 함께 가져오기
  const { data: keywords, error: kwError } = await supabase
    .from("keywords")
    .select("*")
    .order("site", { ascending: true });

  if (kwError) {
    return NextResponse.json({ error: kwError.message }, { status: 500 });
  }

  const { data: ranks, error: rankError } = await supabase
    .from("ranks")
    .select("*")
    .gte("checked_at", since.toISOString())
    .order("checked_at", { ascending: false });

  if (rankError) {
    return NextResponse.json({ error: rankError.message }, { status: 500 });
  }

  // 사이트별로 그룹핑
  const sites: Record<string, any> = {};

  for (const kw of keywords || []) {
    if (!sites[kw.site]) {
      sites[kw.site] = { site: kw.site, keywords: [] };
    }

    const kwRanks = (ranks || [])
      .filter((r) => r.keyword_id === kw.id)
      .map((r) => ({
        rank: r.rank,
        checked_at: r.checked_at,
        title: r.title,
      }));

    sites[kw.site].keywords.push({
      id: kw.id,
      keyword: kw.keyword,
      ranks: kwRanks,
    });
  }

  return NextResponse.json({
    sites: Object.values(sites),
    totalKeywords: keywords?.length || 0,
  });
}