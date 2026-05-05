import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { keyword_id } = await req.json();

    if (!keyword_id) {
      return NextResponse.json({ error: "keyword_id 필요" }, { status: 400 });
    }

    // 키워드 정보 가져오기
    const { data: kw, error: kwError } = await supabase
      .from("keywords")
      .select("*")
      .eq("id", keyword_id)
      .single();

    if (kwError || !kw) {
      return NextResponse.json({ error: "키워드 없음" }, { status: 404 });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "네이버 API 키 미설정" },
        { status: 500 }
      );
    }

    // 네이버 검색
    const url = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(
      kw.keyword
    )}&display=100&start=1`;

    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "네이버 API 호출 실패" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const items = data.items || [];

    // 순위 찾기
    const domain = kw.site.toLowerCase().replace(/^www\./, "");
    const index = items.findIndex((item: any) => {
      try {
        const host = new URL(item.link).hostname.toLowerCase().replace(/^www\./, "");
        return host === domain || host.endsWith("." + domain);
      } catch {
        return item.link.toLowerCase().includes(domain);
      }
    });

    const rank = index !== -1 ? index + 1 : null;
    const title = index !== -1 ? items[index].title.replace(/<[^>]*>/g, "") : "";
    const link = index !== -1 ? items[index].link : "";

    // 결과 저장
    const now = new Date().toISOString();
    await supabase.from("ranks").insert({
      keyword_id: kw.id,
      rank,
      title,
      link,
      checked_at: now,
    });

    return NextResponse.json({
      site: kw.site,
      keyword: kw.keyword,
      rank,
      title,
      link,
      checked_at: now,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "서버 오류" },
      { status: 500 }
    );
  }
}
