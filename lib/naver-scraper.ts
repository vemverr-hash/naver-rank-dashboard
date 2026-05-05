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
    // 가장 확실한 검색 결과인 [웹문서] 탭 1~5페이지를 타겟팅합니다.
    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      const start = (pageNum - 1) * 15 + 1;
      const url = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(keyword)}&start=${start}`;

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(3000); // 네이버가 의심하지 않게 3초간 넉넉히 대기합니다.

      const html = await page.content();
      const $ = cheerio.load(html);

      // [핵심] 특정 클래스명이 아니라, 검색 결과 영역(#main_pack) 안의 모든 '제목성 링크'를 다 긁습니다.
      $("#main_pack a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const title = $(el).text().trim();
        
        // 1. 네이버 내부 링크가 아니고 2. 제목이 3글자 이상이며 3. 실제 주소가 포함된 경우만 수집
        if (
          href.startsWith("http") && 
          !href.includes("search.naver.com") && 
          !href.includes("adcr.naver.com") && 
          title.length > 2
        ) {
          // 중복 링크 방지
          if (!results.find(r => r.link === href)) {
            rank++;
            results.push({
              rank,
              title: title.substring(0, 50), // 제목이 너무 길면 자름
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
  } catch {
    return "";
  }
}

export function findSiteRank(results: SearchResult[], site: string) {
  const targetDomain = site.toLowerCase().replace(/^www\./, "");
  // 도메인이 완전히 일치하거나, 해당 도메인으로 끝나는 경우(서브도메인 포함)를 찾습니다.
  const found = results.find(r => r.domain === targetDomain || r.domain.endsWith("." + targetDomain));
  
  return found 
    ? { rank: found.rank, title: found.title, link: found.link, section: found.section }
    : { rank: null, title: "", link: "", section: "" };
}