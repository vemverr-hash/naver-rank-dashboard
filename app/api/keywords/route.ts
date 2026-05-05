import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ?깅줉???ㅼ썙??紐⑸줉 議고쉶
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

// ???ㅼ썙???깅줉
export async function POST(req: NextRequest) {
  const { site, keyword } = await req.json();

  if (!site || !keyword) {
    return NextResponse.json(
      { error: "?ъ씠?몄? ?ㅼ썙?쒕? ?낅젰?댁＜?몄슂" },
      { status: 400 }
    );
  }

  const domain = site.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

  // 以묐났 泥댄겕
  const { data: existing } = await supabase
    .from("keywords")
    .select("id")
    .eq("site", domain)
    .eq("keyword", keyword.trim())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "?대? ?깅줉???ㅼ썙?쒖엯?덈떎" },
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

// ?ㅼ썙????젣
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  // 愿???쒖쐞 湲곕줉????젣
  await supabase.from("ranks").delete().eq("keyword_id", id);

  const { error } = await supabase.from("keywords").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}