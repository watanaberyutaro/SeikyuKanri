import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateVendorInput, UpdateVendorInput } from '@/types/ap'

// GET /api/vendors - 仕入先一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const isActive = searchParams.get('is_active')

  let query = supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('name', { ascending: true })

  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true')
  }

  const { data: vendors, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vendors })
}

// POST /api/vendors - 仕入先登録
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const body: CreateVendorInput = await request.json()

  if (!body.name) {
    return NextResponse.json({ error: '仕入先名は必須です' }, { status: 400 })
  }

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      name: body.name,
      code: body.code || null,
      email: body.email || null,
      phone: body.phone || null,
      postal_code: body.postal_code || null,
      address: body.address || null,
      contact_person: body.contact_person || null,
      payment_terms: body.payment_terms || null,
      memo: body.memo || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vendor }, { status: 201 })
}

// PATCH /api/vendors?id=xxx - 仕入先更新
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  const body: UpdateVendorInput = await request.json()

  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.code !== undefined) updateData.code = body.code
  if (body.email !== undefined) updateData.email = body.email
  if (body.phone !== undefined) updateData.phone = body.phone
  if (body.postal_code !== undefined) updateData.postal_code = body.postal_code
  if (body.address !== undefined) updateData.address = body.address
  if (body.contact_person !== undefined) updateData.contact_person = body.contact_person
  if (body.payment_terms !== undefined) updateData.payment_terms = body.payment_terms
  if (body.memo !== undefined) updateData.memo = body.memo
  if (body.is_active !== undefined) updateData.is_active = body.is_active

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vendor })
}
