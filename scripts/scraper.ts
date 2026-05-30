import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase DB 연결 (GitHub Actions 환경변수 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🤖 30분 주기 네이버 순위 스크래핑을 시작합니다...');

  const { data: keywords, error } = await supabase.from('keywords').select('*');
  if (error || !keywords) {
    console.error('❌ DB에서 키워드를 불러오지 못했습니다:', error);
    process.exit(1);
  }

  console.log(`총 ${keywords.length}개의 키워드 탐색을 준비합니다.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 }
  });

  const page = await context.newPage();

  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "media", "font", "stylesheet"].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  // 4. 키워드별로 순회하며 순위 판독 시작
  for (const kw of keywords) {
    console.log(`\n🔍 [${kw.keyword}] (타겟: ${kw.site}) 탐색 시작 (최대 10페이지)...`);
    
    try {
      // 웹사이트 탭(m_webkr)으로 직행
      const url = `https://m.search.naver.com/search.naver?where=m_webkr&query=${encodeURIComponent(kw.keyword)}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      
      let cumulativeRank = 0; // 페이지가 넘어가도 순위가 누적되도록 하는 변수
      let foundRank = null;
      let finalTitle = "순위권 밖";

      // 💡 [핵심] 1페이지부터 10페이지까지 반복하며 찾기
      for (let pageNum = 1; pageNum <= 10; pageNum++) {
        await page.waitForTimeout(1000); // 페이지 로딩 대기
        
        // 스크롤을 맨 아래로 내려서 모든 요소 렌더링 유도
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        const pageResult = await page.evaluate(({ targetDomain, startRank }) => {
          const selectors = 'li.bx, div.total_wrap, div.api_ani_send, li.place_list_item, div.api_subject_bx';
          const rawBlocks = Array.from(document.querySelectorAll(selectors));
          const leafBlocks: Element[] = [];

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

          let rank = startRank;
          let isFound = false;
          let foundTitle = "순위권 밖";

          leafBlocks.forEach(block => {
            if (isFound) return; 

            const text = (block.textContent || "").trim().replace(/\n/g, ' ');
            const html = block.innerHTML || "";

            if (text.includes('관련검색어') && text.length < 100) return; 

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

            const links = Array.from(block.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'));
            const validLinks = links.filter(a => {
              const h = a.href;
              return !h.includes('search.naver.com') && !h.includes('help.naver.com') && !h.includes('nid.naver.com') && !h.includes('policy.naver.com');
            });

            if (validLinks.length === 0) return;

            rank++; // 순위 증가

            if (html.includes(targetDomain) || text.includes(targetDomain)) {
              isFound = true;
              foundTitle = text.substring(0, 45) + '...'; 
            }
          });

          return { isFound, rank, foundTitle, count: rank - startRank };
        }, { targetDomain: kw.site, startRank: cumulativeRank });

        if (pageResult.isFound) {
          foundRank = pageResult.rank;
          finalTitle = pageResult.foundTitle;
          console.log(`   🎉 ${pageNum}페이지에서 발견! (${foundRank}위)`);
          break; // 찾았으니 다음 페이지로 안 넘어가고 탐색 종료!
        } else {
          cumulativeRank += pageResult.count; // 이번 페이지의 순위 개수를 누적
        }

        // 못 찾았다면 '다음(>)' 버튼 찾아서 클릭하기
        const nextBtn = await page.$('.pg_next, .btn_next, a.next, a[title="다음"], .paginate_next');
        if (nextBtn) {
          console.log(`   - ${pageNum}페이지에 없음. 다음 페이지로 이동...`);
          await nextBtn.click();
          await page.waitForTimeout(2000); // 새 페이지가 뜰 때까지 2초 대기
        } else {
          break; // 다음 버튼이 없으면 더 이상 페이지가 없는 것이므로 탐색 종료
        }
      }

      // 5. 판독된 순위를 DB에 저장
      const rankToSave = foundRank > 0 ? foundRank : null;
      
      const { error: insertError } = await supabase.from('ranks').insert({
        keyword_id: kw.id,
        rank: rankToSave,
        title: finalTitle,
        checked_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error(`❌ [${kw.keyword}] DB 저장 실패:`, insertError);
      } else {
        console.log(`✅ [${kw.keyword}] ${rankToSave ? rankToSave + '위' : '순위 없음'} - DB 저장 완료!`);
      }

    } catch (e: any) {
      console.error(`🚨 [${kw.keyword}] 탐색 중 에러 발생:`, e.message);
    }
  }

  await browser.close();
  console.log('\n🎉 모든 키워드의 30분 주기 순위 수집 및 업데이트가 완료되었습니다!');
}

main().catch(console.error);