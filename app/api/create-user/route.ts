import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, password, prenom, nom, role, taux_horaire } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Créer le compte Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Créer la ligne dans la table salaries
    const { data: salarieData, error: salarieError } = await supabaseAdmin
      .from('salaries')
      .insert({
        id: authData.user.id,
        email,
        prenom,
        nom,
        role,
        taux_horaire,
        actif: true,
      })
      .select()
      .single()

    if (salarieError) {
      // Si erreur, supprimer le compte auth créé
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: salarieError.message }, { status: 400 })
    }

    return NextResponse.json({ salarie: salarieData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
