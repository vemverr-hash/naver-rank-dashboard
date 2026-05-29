from playwright.sync_api import sync_playwright

def check_naver_mobile_rank(keyword, target_domain):
    try:
        with sync_playwright() as p:
            print("⏳ 1. 브라우저 엔진 가동 중 (최종 노이즈 제거)...")
            browser = p.chromium.launch(headless=True) 
            context = browser.new_context(
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                viewport={'width': 390, 'height': 844}
            )
            page = context.new_page()

            page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font", "stylesheet"] else route.continue_())

            url = f"https://m.search.naver.com/search.naver?query={keyword}"
            print(f"⏳ 2. [{keyword}] 네이버 검색 및 결과 수집 중...")
            page.goto(url, wait_until="domcontentloaded") 
            
            for _ in range(3):
                page.mouse.wheel(0, 1500)
                page.wait_for_timeout(500)

            print("⏳ 3. 외부 링크가 없는 껍데기(메뉴, AI 안내 등) 완벽 소각 중...")
            
            result_data = page.evaluate("""(targetDomain) => {
                let selectors = 'li.bx, div.total_wrap, div.api_ani_send, li.place_list_item, div.api_subject_bx';
                let rawBlocks = Array.from(document.querySelectorAll(selectors));
                let leafBlocks = [];

                // 1. 포장지 제거 (가장 안쪽 알맹이 상자만 남김)
                rawBlocks.forEach(block => {
                    let hasChildBlock = false;
                    let children = block.querySelectorAll(selectors);
                    
                    for(let i = 0; i < children.length; i++) {
                        if (children[i].innerText.trim().length > 5) {
                            hasChildBlock = true;
                            break;
                        }
                    }

                    if (!hasChildBlock && block.innerText.trim().length > 10) {
                        leafBlocks.push(block);
                    }
                });

                let rank = 0;
                let foundRank = -1;
                let debugLog = [];

                leafBlocks.forEach(block => {
                    let text = block.innerText.trim().replace(/\\n/g, ' ');
                    let html = block.innerHTML || "";

                    // 2. 명시적 쓰레기 필터링
                    if (text.includes('관련검색어') && text.length < 100) return; 

                    // 3. 광고 상자 투명인간 처리
                    let isAd = false;
                    block.querySelectorAll('a').forEach(a => {
                        let h = a.href || "";
                        if (h.includes('adcr.naver') || h.includes('ader.naver') || h.includes('ad.naver')) isAd = true;
                    });
                    block.querySelectorAll('span, i, em, mark, div').forEach(b => {
                        if (b.children.length === 0) {
                            let bt = b.textContent.trim();
                            if (bt === '광고ⓘ' || bt === '파워링크' || bt === '광고') isAd = true;
                        }
                    });
                    if (isAd) return;

                    // 💡 4. [핵심] 밖으로 나가는 '진짜 링크'가 없으면 메뉴판으로 간주하고 버림!
                    let links = Array.from(block.querySelectorAll('a[href^="http"]'));
                    let validLinks = links.filter(a => {
                        let h = a.href;
                        // 네이버 내부 시스템 메뉴들은 도착지로 치지 않습니다.
                        return !h.includes('search.naver.com') && 
                               !h.includes('help.naver.com') && 
                               !h.includes('nid.naver.com') &&
                               !h.includes('policy.naver.com');
                    });

                    // 유효한 외부 링크가 단 하나도 없으면 스킵! (정렬, AI추천, 페이지네이션 싹 날아감)
                    if (validLinks.length === 0) return;

                    let primaryLink = validLinks[0];
                    let host = new URL(primaryLink.href).hostname;

                    // ✅ 모든 방어막을 뚫고 살아남은 순수 100% 진짜 순위
                    rank++;
                    debugLog.push(`[${rank}위] ` + text.substring(0, 45) + '... (도메인: ' + host + ')');

                    if (foundRank === -1 && (html.includes(targetDomain) || text.includes(targetDomain))) {
                        foundRank = rank;
                    }
                });

                return { rank: foundRank, debugLog: debugLog };
            }""", target_domain)

            browser.close()
            return result_data
            
    except Exception as e:
        return {"rank": -1, "error": str(e)}

if __name__ == "__main__":
    test_keyword = "천안삼거리공원 벽산블루밍"
    test_domain = "ubora-ivypark3.co.kr"
    
    result = check_naver_mobile_rank(test_keyword, test_domain)
    
    print("\n" + "=" * 65)
    print("🔍 [디버깅] 노이즈 0% 완벽 순위표:")
    print("-" * 65)
    
    for log in result.get('debugLog', []):
        print(log)
        
    print("-" * 65)
    rank = result.get('rank', -1)
    if rank > 0:
        print(f"🎉 탐색 성공! 불순물 0%, 대표님 사이트의 진짜 순위는 {rank}위 입니다.")
    elif result.get('error'):
        print(f"🚨 시스템 에러 발생: {result.get('error')}")
    else:
        print("😢 1페이지에서 찾을 수 없거나 판독에 실패했습니다.")
    print("=" * 65)