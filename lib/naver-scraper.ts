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

      // 🚨 핵심 수정: 개별 링크가 아니라 '결과 박스(.bx)'를 먼저 찾습니다.
      const resultBlocks = $("#main_pack .bx, #main_pack .view_wrap, #main_pack .v_node");

      if (resultBlocks.length === 0) break;

      resultBlocks.each((_, el) => {
        // 박스 안에서 가장 중요한 '진짜 제목 링크' 하나만 딱 집어냅니다.
        const titleEl = $(el).find("a.link_tit, a.total_tit, .title_area a, .title_link").first();
        const href = titleEl.attr("href") || "";
        const title = titleEl.text().trim();
        
        // 네이버 내부 주소가 아닌 진짜 외부 사이트인 경우만 카운트!
        if (href.startsWith("http") && !href.includes("search.naver.com") && title.length > 0) {
          // 이미 수집한 링크가 아니면 순위를 올립니다.
          if (!results.find(r => r.link === href)) {
            rank++;
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