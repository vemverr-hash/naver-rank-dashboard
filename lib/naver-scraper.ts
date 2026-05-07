import * as cheerio from "cheerio";
import { chromium } from "playwright";

export interface SearchResult {
  rank: number;
  title: string;
  link: string;
  domain: string;
  section: string;
}

export async function scrapeNaverSearch(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  let rank = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      const start = (pageNum - 1) * 15 + 1;
      const url = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(keyword)}&start=${start}`;

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000); 

      const html = await page.content();
      const $ = cheerio.load(html);

      // 🚨 최종 정답: 껍데기를 찾지 않고, 메인 제목(가장 큰 글씨)에만 붙는 고유 이름표들을 직통으로 찾습니다!
      // 이렇게 하면 밑에 주렁주렁 달린 서브 링크들은 완벽하게 무시됩니다.
      const mainTitles = $("#main_pack a.link_tit, #main_pack .total_tit a, #main_pack a.total_tit, #main_pack .title_link, #main_pack .title_area a");

      if (mainTitles.length === 0) break;

      mainTitles.each((_, el) => {
        const href = $(el).attr("href") || "";
        const title = $(el).text().trim();
        
        // 네이버 내부 주소가 아닌 진짜 외부 사이트인 경우만
        if (href.startsWith("http") && !href.includes("search.naver.com") && title.length > 0) {
          if (!results.find(r => r.link === href)) {
            rank++; // 메인 제목 1개당 정확히 1위씩만 올라갑니다.
            results.push({
              rank,
              title: title,
              link: href,
              domain: extractDomain(href),
              section: "웹결과",
            });
          }
        }
      });
    }
  } catch (error) {
    console.error("Scraping failed:", error);
  } finally {
    await browser.close();
  }

  return results;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch { return ""; }
}

export function findSiteRank(results: SearchResult[], site: string) {
  const targetDomain = site.toLowerCase().replace(/^www\./, "");
  const found = results.find(r => r.domain === targetDomain || r.domain.endsWith("." + targetDomain));
  return found ? { rank: found.rank, title: found.title, link: found.link, section: found.section } : { rank: null, title: "", link: "", section: "" };
}