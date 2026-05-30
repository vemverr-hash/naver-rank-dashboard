import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase DB 연결 (GitHub Actions 환경변수 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🤖 30분 주기 네이버 순위 스크래핑을 시작합니다...');

  // 2. DB에서 추적할 키워드 목록 불러오기
  const { data: keywords, error } = await supabase.from('keywords').select('*');
  if (error || !keywords) {
    console.error('❌ DB에서 키워드를 불러오지 못했습니다:', error);
    process.exit(1);
  }

  console.log(`총 ${keywords.length}개의 키워드 탐색을 준비합니다.`);

  // 3. 브라우저 엔진 가동 (모든 키워드를 이 브라우저 하나로 처리하여 속도 극대화)
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 }
  });

  const page = await context.newPage();

  // 이미지, 폰트 차단 (속도 향상 및 트래픽 절약)
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
    // 💡 수정 완료: kw.domain -> kw.site
    console.log(`\n🔍 [${kw.keyword}] (타겟: ${kw.site}) 탐색 시작...`);
    
    try {
      const url = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(kw.keyword)}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      
      // 스크롤 내려서 숨겨진 영역 로딩
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 1500);
        await page.waitForTimeout(500);
      }

      // 💡 [핵심] 우리가 완성한 '알맹이(Leaf Node) 추출' 극강 로직
      const resultData = await page.evaluate((targetDomain) => {
        const selectors = 'li.bx, div.total_wrap, div.api_ani_send, li.place_list_item, div.api_subject_bx';
        const rawBlocks = Array.from(document.querySelectorAll(selectors));
        const leafBlocks: Element[] = [];

        // 포장지 제거
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
        let finalTitle = "순위권 밖";

        leafBlocks.forEach(block => {
          const text = (block.textContent || "").trim().replace(/\n/g, ' ');
          const html = block.innerHTML || "";

          // 쓰레기 필터링
          if (text.includes('관련검색어') && text.length < 100) return; 

          // 광고 투명인간 처리
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

          // 가짜 메뉴(시스템 링크) 필터링
          const links = Array.from(block.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'));
          const validLinks = links.filter(a => {
            const h = a.href;
            return !h.includes('search.naver.com') && 
                   !h.includes('help.naver.com') && 
                   !h.includes('nid.naver.com') &&
                   !h.includes('policy.naver.com');
          });

          if (validLinks.length === 0) return;

          // 순위 인정!
          rank++;

          // 내 도메인이 발견되면 순위와 제목 확정
          if (foundRank === -1 && (html.includes(targetDomain) || text.includes(targetDomain))) {
            foundRank = rank;
            // DB에 저장할 수 있도록 텍스트 길이를 45자로 예쁘게 자름
            finalTitle = text.substring(0, 45) + '...'; 
          }
        });

        return { rank: foundRank, title: finalTitle };
      }, kw.site); // 💡 수정 완료: DB에 저장된 도메인(`kw.site`)을 봇에게 전달

      // 5. 판독된 순위를 DB(`ranks` 테이블)에 바로 저장
      const rankToSave = resultData.rank > 0 ? resultData.rank : null;
      
      const { error: insertError } = await supabase.from('ranks').insert({
        keyword_id: kw.id,
        rank: rankToSave,
        title: resultData.title,
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

  // 6. 모든 작업이 끝나면 브라우저를 안전하게 종료
  await browser.close();
  console.log('\n🎉 모든 키워드의 30분 주기 순위 수집 및 업데이트가 완료되었습니다!');
}

// 스크립트 실행
main().catch(console.error);