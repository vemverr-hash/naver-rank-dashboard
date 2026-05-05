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

  // 1. 브라우저를 한 번만 켭니다.
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // 2. 1페이지부터 5페이지까지 샅샅이 뒤집니다! (1페이지당 15개씩 노출)
    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      // 네이버 웹문서 페이지 계산 공식 (1, 16, 31, 46, 61...)
      const start = (pageNum - 1) * 15 + 1; 
      
      // 통합검색(nexearch)이 아닌 웹문서(web) 탭으로 이동!
      const url = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(keyword)}&start=${start}`;

      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000); // 로딩 대기

      const html = await page.content();
      const $ = cheerio.load(html);

      // 웹문서 탭의 제목 링크들을 모두 찾습니다
      const links = $(".total_tit a, .api_txt_lines.total_tit a, .title_link");

      // 만약 더 이상 검색 결과가 없으면 (예: 3페이지에서 끝난 경우) 반복을 멈춥니다
      if (links.length === 0) break;

      // 3. 찾은 링크들에 순위를 매기며 장바구니에 담습니다.
      links.each((_, el) => {
        const href = $(el).attr("href") || "";
        const title = $(el).text().trim();
        
        // 중복된 링크가 아닐 경우에만 순위 추가
        if (href && title && !results.find((r) => r.link === href)) {
          rank++;
          results.push({
            rank,
            title,
            link: href,
            domain: extractDomain(href),
            section: "웹문서", // 이제 출처는 무조건 '웹문서' 탭입니다
          });
        }
      });
    }
  } catch (error) {
    console.error("Playwright fetch failed:", error);
  } finally {
    // 4. 검색이 다 끝나면 브라우저를 꼭 닫아줍니다.
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

  const found = results.find((r) => {
    return r.domain === domain || r.domain.endsWith("." + domain);
  });

  if (found) {
    return {
      rank: found.rank,
      title: found.title,
      link: found.link,
      section: found.section,
    };
  }

  return { rank: null, title: "", link: "", section: "" };
}