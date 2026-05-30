import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    // 💡 핵심 해결책: DB 연결을 맨 위가 아니라 함수 '안'으로 이동!
    // 이렇게 하면 Next.js가 빌드(테스트)할 때 에러를 뿜지 않습니다.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // 환경변수가 없을 때 뻗지 않고 안전하게 에러를 뱉도록 방어막 추가
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "DB 열쇠가 설정되지 않았습니다." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 대시보드에서 요청한 '며칠 치(days)' 데이터를 볼 것인지 파악 (기본 7일)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 2. DB에서 추적 중인 키워드 목록 가져오기
    const { data: keywords, error: kwError } = await supabase.from('keywords').select('*');
    if (kwError) throw kwError;

    // 3. DB에서 날짜 필터링해서 순위 기록(ranks) 가져오기
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const { data: ranks, error: rankError } = await supabase
      .from('ranks')
      .select('*')
      .gte('checked_at', dateLimit.toISOString())
      .order('checked_at', { ascending: false });

    if (rankError) throw rankError;

    // 4. 대시보드 화면(UI)이 원하는 형태로 데이터 조립하기 (도메인별 -> 키워드별 -> 순위)
    const sitesMap: Record<string, any> = {};

    keywords.forEach(kw => {
      const siteName = kw.domain; 
      if (!sitesMap[siteName]) {
        sitesMap[siteName] = { site: siteName, keywords: [] };
      }
      
      const kwRanks = ranks.filter(r => r.keyword_id === kw.id);
      
      sitesMap[siteName].keywords.push({
        id: kw.id,
        keyword: kw.keyword,
        ranks: kwRanks
      });
    });

    const dashboardData = {
      sites: Object.values(sitesMap),
      totalKeywords: keywords.length
    };

    // 5. 대시보드 화면으로 데이터 쏴주기!
    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error: any) {
    console.error("데이터 조회 에러:", error);
    return NextResponse.json({ error: error.message || "서버 에러가 발생했습니다." }, { status: 500 });
  }
}
