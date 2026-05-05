import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
}

async function searchNaver(keyword: string): Promise<NaverSearchItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID!;
  const clientSecret = process.env.NAVER_CLIENT_SECRET!;

  const url = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(
    keyword
  )}&display=100&start=1`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!res.ok) {
    console.error(`Naver API error for "${keyword}":`, await res.text());
    return [];
  }

  const data = await res.json();
  return data.items || [];
}

function findRank(
  items: NaverSearchItem[],
  site: string
): { rank: number | null; title: string; link: string } {
  const domain = site.toLowerCase().replace(/^www\./, "");

  const index = items.findIndex((item) => {
    try {
      const host = new URL(item.link).hostname.toLowerCase().replace(/^www\./, "");
      return host === domain || host.endsWith("." + domain);
    } catch {
      return item.link.toLowerCase().includes(domain);
    }
  });

  if (index !== -1) {
    return {
      rank: index + 1,
      title: items[index].title.replace(/<[^>]*>/g, ""),
      link: items[index].link,
    };
  }
  return { rank: null, title: "", link: "" };
}

export async function GET(req: NextRequest) {
  // 간단한 보안: secret key 확인
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // API 키 확인
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "네이버 API 키 미설정" },
      { status: 500 }
    );
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

  // 같은 키워드는 한 번만 검색 (여러 사이트가 같은 키워드 추적 가능)
  const uniqueKeywords = [...new Set(keywords.map((k) => k.keyword))];
  const searchCache: Record<string, NaverSearchItem[]> = {};

  for (const kw of uniqueKeywords) {
    searchCache[kw] = await searchNaver(kw);
    // API 과부하 방지: 요청 사이 0.5초 대기
    await new Promise((r) => setTimeout(r, 500));
  }

  // 각 키워드+사이트 조합의 순위 저장
  const now = new Date().toISOString();
  const inserts = keywords.map((kw) => {
    const items = searchCache[kw.keyword] || [];
    const result = findRank(items, kw.site);
    return {
      keyword_id: kw.id,
      rank: result.rank,
      title: result.title,
      link: result.link,
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

  return NextResponse.json({
    message: "순위 체크 완료",
    checked: inserts.length,
    time: now,
  });
}
