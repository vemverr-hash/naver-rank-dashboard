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

        // 🚨 핀셋 수정: [웹문서] 탭의 정통 검색 결과 리스트(ul.lst_total 하위의 li.bx)만 정확히 타겟팅!
        // 이렇게 하면 연관검색어나 이상한 추천 블록들을 아예 무시합니다.
        const resultBlocks = $("ul.lst_total > li.bx");

        if (resultBlocks.length === 0) break;

        resultBlocks.each((_, el) => {
          // 각 결과 박스에서 가장 대표가 되는 제목 링크 하나만 추출
          const titleEl = $(el).find(".total_tit a, .link_tit, .title_link").first();
          const href = titleEl.attr("href") || "";
          const title = titleEl.text().trim();
          
          if (href.startsWith("http") && !href.includes("search.naver.com") && title.length > 0) {
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