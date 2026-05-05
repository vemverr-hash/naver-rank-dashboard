import * as cheerio from "cheerio";
import { chromium } from "playwright";

export interface SearchResult {
  rank: number;
  title: string;
  link: string;
  domain: string;
  section: string;
}

export async function scrapeNaverSearch(
  keyword: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  let rank = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // 네이버가 로봇인지 눈치채지 못하게 진짜 사람의 크롬 브라우저인 것처럼 완벽하게 위장합니다.
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" }
  });
  const page = await context.newPage();

  try {
    // 🚨 봇 차단을 피하기 위해 일단 1~5페이지(75위)까지만 스텔스 모드로 탐색합니다.
    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      const start = (pageNum - 1) * 15 + 1; 
      const url = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(keyword)}&start=${start}`;

      // networkidle(완벽히 뜰 때까지 대기) 대신 domcontentloaded(글자만 뜨면 즉시 시작)로 변경!
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000); // 사람처럼 페이지를 읽는 척 2초간 뜸을 들입니다.

      const html = await page.content();
      const $ = cheerio.load(html);

      // 🚨 무적의 그물망: 이름표(클래스명)가 뭐든 상관없이 검색 결과창 안의 외부 링크를 싹 다 잡아냅니다!
      const links = $("#main_pack a").filter((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        const className = $(el).attr("class") || "";
        
        // 네이버 내부 링크 제외, 텍스트 없는 링크 제외, 클래스명에 링크 관련 단어가 있는 진짜 제목만 필터링!
        return href.startsWith("http") && 
               !href.includes("naver.com") && 
               text.length > 2 && 
               (className.includes("tit") || className.includes("name") || className.includes("link"));
      });

      if (links.length === 0) break; // 페이지 끝에 도달했거나 막히면 깔끔하게 종료

      links.each((_, el) => {
        const href = $(el).attr("href") || "";
        const title = $(el).text().trim();
        
        if (href && title && !results.find((r) => r.link === href)) {
          rank++;
          results.push({
            rank,
            title,
            link: href,
            domain: extractDomain(href),
            section: "웹문서", 
          });
        }
      });
    }
  } catch (error) {
    console.error("Playwright fetch failed:", error);
  } finally {
    await browser.close();
  }

  return results;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function findSiteRank(
  results: SearchResult[],
  site: string
): { rank: number | null; title: string; link: string; section: string } {
  const domain = site.toLowerCase().replace(/^www\./, "");
  const found = results.find((r) => r.domain === domain || r.domain.endsWith("." + domain));
  return found ? { rank: found.rank, title: found.title, link: found.link, section: found.section } : { rank: null, title: "", link: "", section: "" };
}