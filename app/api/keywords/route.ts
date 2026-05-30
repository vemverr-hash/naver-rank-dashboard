import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 💡 빌드 에러 방지용 헬퍼 함수: 무조건 함수 '안'에서만 DB 열쇠를 찾도록 격리!
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// 1. 등록된 키워드 목록 조회
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("keywords")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 2. 새 키워드 등록
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const { site, keyword } = await req.json();

  if (!site || !keyword) {
    return NextResponse.json(
      { error: "사이트와 키워드를 입력해주세요" },
      { status: 400 }
    );
  }

  const domain = site.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

  // 중복 체크
  const { data: existing } = await supabase
    .from("keywords")
    .select("id")
    .eq("site", domain)
    .eq("keyword", keyword.trim())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "이미 등록된 키워드입니다" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("keywords")
    .insert({ site: domain, keyword: keyword.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 3. 키워드 삭제
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  const { id } = await req.json();

  // 관련 순위 기록도 삭제
  await supabase.from("ranks").delete().eq("keyword_id", id);

  const { error } = await supabase.from("keywords").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}