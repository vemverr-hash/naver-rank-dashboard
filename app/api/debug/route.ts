import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("q") || "영종 대라수 어썸";
  const site = req.nextUrl.searchParams.get("site") || "cukiz.co.kr";

  // 1. 통합검색 (nexearch)
  const nexearchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword)}`;
  const nexearchRes = await fetch(nexearchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  const nexearchHtml = await nexearchRes.text();

  // 2. 웹검색 (webkr)  
  const webUrl = `https://search.naver.com/search.naver?where=webkr&query=${encodeURIComponent(keyword)}`;
  const webRes = await fetch(webUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  const webHtml = await webRes.text();

  // 3. 모바일 검색
  const mobileUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
  const mobileRes = await fetch(mobileUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  const mobileHtml = await mobileRes.text();

  // 각 HTML에서 사이트 도메인이 있는지 확인
  const findDomainContext = (html: string, domain: string) => {
    const contexts: string[] = [];
    let idx = 0;
    while ((idx = html.indexOf(domain, idx)) !== -1) {
      const start = Math.max(0, idx - 100);
      const end = Math.min(html.length, idx + domain.length + 100);
      contexts.push(html.substring(start, end));
      idx += domain.length;
    }
    return contexts;
  };

  // 웹검색 결과에서 href 링크 추출
  const webLinkRegex = /href="(https?:\/\/(?!.*naver\.com)[^"]+)"/g;
  const webLinks: string[] = [];
  let match;
  while ((match = webLinkRegex.exec(webHtml)) !== null) {
    webLinks.push(match[1]);
  }

  // 모바일 결과에서 href 링크 추출
  const mobileLinkRegex = /href="(https?:\/\/(?!.*naver\.com)[^"]+)"/g;
  const mobileLinks: string[] = [];
  while ((match = mobileLinkRegex.exec(mobileHtml)) !== null) {
    mobileLinks.push(match[1]);
  }

  return NextResponse.json({
    keyword,
    site,
    nexearch: {
      htmlLength: nexearchHtml.length,
      containsSite: nexearchHtml.includes(site),
      siteContexts: findDomainContext(nexearchHtml, site).slice(0, 5),
    },
    webSearch: {
      htmlLength: webHtml.length,
      containsSite: webHtml.includes(site),
      siteContexts: findDomainContext(webHtml, site).slice(0, 5),
      externalLinks: webLinks.slice(0, 20),
    },
    mobile: {
      htmlLength: mobileHtml.length,
      containsSite: mobileHtml.includes(site),
      siteContexts: findDomainContext(mobileHtml, site).slice(0, 5),
      externalLinks: mobileLinks.slice(0, 20),
    },
  });
}
