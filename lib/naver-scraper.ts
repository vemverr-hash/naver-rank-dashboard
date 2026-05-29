import { chromium } from 'playwright';

// 순위 결과 반환 타입 정의
export interface RankResult {
  rank: number;
  debugLog?: string[];
  error?: string;
}

export async function checkNaverMobileRank(keyword: string, targetDomain: string): Promise<RankResult> {
  let browser;
  try {
    console.log("⏳ 1. 브라우저 엔진 가동 중 (최종 노이즈 제거)...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 }
    });
    
    const page = await context.newPage();

    // 속도 향상을 위해 이미지와 폰트만 조용히 차단
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const url = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
    console.log(`⏳ 2. [${keyword}] 네이버 검색 및 결과 수집 중...`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    // 3번 스크롤하며 대기 (비동기 처리)
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(500);
    }

    console.log("⏳ 3. 외부 링크가 없는 껍데기 완벽 소각 중...");
    
    const resultData = await page.evaluate((domain) => {
      const selectors = 'li.bx, div.total_wrap, div.api_ani_send, li.place_list_item, div.api_subject_bx';
      const rawBlocks = Array.from(document.querySelectorAll(selectors));
      const leafBlocks: Element[] = [];

      // 1. 포장지 제거 (가장 안쪽 알맹이 상자만 남김)
      rawBlocks.forEach(block => {
        let hasChildBlock = false;
        const children = block.querySelectorAll(selectors);
        
        for(let i = 0; i < children.length; i++) {
          if ((children[i].textContent || "").trim().length > 5) {
            hasChildBlock = true;
            break;
          }
        }

        if (!hasChildBlock && (block.textContent || "").trim().length > 10) {
          leafBlocks.push(block);
        }
      });

      let rank = 0;
      let foundRank = -1;
      const debugLog: string[] = [];

      leafBlocks.forEach(block => {
        const text = (block.textContent || "").trim().replace(/\n/g, ' ');
        const html = block.innerHTML || "";

        // 2. 명시적 쓰레기 필터링
        if (text.includes('관련검색어') && text.length < 100) return; 

        // 3. 광고 상자 투명인간 처리
        let isAd = false;
        block.querySelectorAll('a').forEach(a => {
          const h = a.href || "";
          if (h.includes('adcr.naver') || h.includes('ader.naver') || h.includes('ad.naver')) isAd = true;
        });
        
        block.querySelectorAll('span, i, em, mark, div').forEach(b => {
          if (b.children.length === 0) {
            const bt = (b.textContent || "").trim();
            if (bt === '광고ⓘ' || bt === '파워링크' || bt === '광고') isAd = true;
          }
        });
        if (isAd) return;

        // 4. [핵심] 밖으로 나가는 '진짜 링크' 검증
        const links = Array.from(block.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'));
        const validLinks = links.filter(a => {
          const h = a.href;
          return !h.includes('search.naver.com') && 
                 !h.includes('help.naver.com') && 
                 !h.includes('nid.naver.com') &&
                 !h.includes('policy.naver.com');
        });

        if (validLinks.length === 0) return;

        const primaryLink = validLinks[0];
        const host = new URL(primaryLink.href).hostname;

        rank++;
        debugLog.push(`[${rank}위] ` + text.substring(0, 45) + '... (도메인: ' + host + ')');

        if (foundRank === -1 && (html.includes(domain) || text.includes(domain))) {
          foundRank = rank;
        }
      });

      return { rank: foundRank, debugLog };
    }, targetDomain);

    await browser.close();
    return resultData;
    
  } catch (error: any) {
    if (browser) await browser.close();
    return { rank: -1, error: error.message };
  }
}