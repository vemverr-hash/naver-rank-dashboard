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
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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

      // 1. 네이버 검색 결과의 큰 덩어리(리스트 블록)들을 모두 잡습니다.
      const blocks = $("#main_pack .bx, #main_pack .api_ani_send, #main_pack li");

      blocks.each((_, el) => {
        // 2. 블록 안의 모든 링크(a 태그)를 순서대로 꺼냅니다.
        const links = $(el).find("a").toArray();
        
        for (const a of links) {
          const href = $(a).attr("href") || "";
          const title = $(a).text().trim();

          // 3. 네이버 내부 주소가 아닌 '외부 웹사이트 링크'이면서 글자가 있는 것을 찾습니다.
          if (href.startsWith("http") && !href.includes("naver.com") && title.length > 1) {
            
            // 4. 이 블록에서 '처음' 발견된 외부 링크만 진짜 순위로 인정!
            if (!results.find(r => r.link === href)) {
              rank++;
              results.push({
                rank,
                title: title.substring(0, 50),
                link: href,
                domain: extractDomain(href),
                section: "웹결과",
              });
            }
            // 🚨 핵심: 메인 제목을 찾았으니, 밑에 달린 서브 링크들은 쳐다보지도 않고 다음 블록으로 넘어갑니다. (뻥튀기 방지)
            break; 
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