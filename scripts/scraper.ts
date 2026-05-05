import { supabase } from "../lib/supabase";
import { scrapeNaverSearch, findSiteRank } from "../lib/naver-scraper";

async function runScraper() {
  console.log("🚀 [GitHub Actions] 네이버 순위 수집 시작!");

  // 1. 등록된 모든 키워드 가져오기
  const { data: keywords, error } = await supabase.from("keywords").select("*");

  if (error || !keywords || keywords.length === 0) {
    console.log("❌ 등록된 키워드가 없거나 불러오기 실패:", error);
    return;
  }

  // 2. 중복 방지 (같은 키워드는 한 번만 검색)
  const uniqueKeywords = [...new Set(keywords.map((k) => k.keyword))];
  const searchCache: Record<string, any> = {};

  // 3. 네이버 검색 (시간제한이 없으니 2초 대기로 넉넉하게 세팅!)
  for (const kw of uniqueKeywords) {
    try {
      searchCache[kw] = await scrapeNaverSearch(kw);
      console.log(`✅ 검색 완료: ${kw}`);
    } catch (err) {
      console.error(`❌ 검색 실패 "${kw}":`, err);
      searchCache[kw] = [];
    }
    // 네이버 차단 방지: 2초 푹 쉬기 (깃허브는 안 튕기니까 안심하세요!)
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 4. 순위 매칭 및 저장 준비
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

  // 5. DB에 저장
  const { error: insertError } = await supabase.from("ranks").insert(inserts);

  if (insertError) {
    console.error("❌ DB 저장 실패:", insertError);
  } else {
    console.log(`🎉 총 ${inserts.length}건 DB 저장 완료!`);
  }
  
  // 성공적으로 끝나면 프로그램 종료
  process.exit(0);
}

runScraper();