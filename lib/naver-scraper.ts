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
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      const start = (pageNum - 1) * 15 + 1; 
      const url = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(keyword)}&start=${start}`;

      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000); 

      const html = await page.content();
      const $ = cheerio.load(html);

      // 🚨 핵심 수정: 네이버 '웹문서' 탭 전용 클래스명(.link_tit, .title_area 등) 완벽 추가!
      const links = $("a.link_tit, .total_wrap a.link_tit, .total_tit a, a.total_tit, .title_link, .title_area a");

      if (links.length === 0) break;

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