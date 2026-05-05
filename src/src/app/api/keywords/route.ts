import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 등록된 키워드 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from("keywords")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 새 키워드 등록
export async function POST(req: NextRequest) {
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

// 키워드 삭제
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  // 관련 순위 기록도 삭제
  await supabase.from("ranks").delete().eq("keyword_id", id);

  const { error } = await supabase.from("keywords").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
