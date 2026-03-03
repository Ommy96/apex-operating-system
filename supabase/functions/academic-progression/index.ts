import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Grade progression mapping
const GRADE_PROGRESSION: Record<string, { nextGrade: string; nextLevel: string } | 'graduated'> = {
  'Play Group': { nextGrade: 'PP1', nextLevel: 'Pre Primary' },
  'PP1': { nextGrade: 'PP2', nextLevel: 'Pre Primary' },
  'PP2': { nextGrade: 'Grade 1', nextLevel: 'Lower Primary' },
  'Grade 1': { nextGrade: 'Grade 2', nextLevel: 'Lower Primary' },
  'Grade 2': { nextGrade: 'Grade 3', nextLevel: 'Lower Primary' },
  'Grade 3': { nextGrade: 'Grade 4', nextLevel: 'Upper Primary' },
  'Grade 4': { nextGrade: 'Grade 5', nextLevel: 'Upper Primary' },
  'Grade 5': { nextGrade: 'Grade 6', nextLevel: 'Upper Primary' },
  'Grade 6': { nextGrade: 'Grade 7', nextLevel: 'Junior Secondary School' },
  'Grade 7': { nextGrade: 'Grade 8', nextLevel: 'Junior Secondary School' },
  'Grade 8': { nextGrade: 'Grade 9', nextLevel: 'Junior Secondary School' },
  'Grade 9': { nextGrade: 'Grade 10', nextLevel: 'Senior School' },
  'Grade 10': { nextGrade: 'Grade 11', nextLevel: 'Senior School' },
  'Grade 11': { nextGrade: 'Grade 12', nextLevel: 'Senior School' },
  'Grade 12': { nextGrade: '1st Year', nextLevel: 'Tertiary' },
  'Form 3': { nextGrade: 'Form 4', nextLevel: 'Secondary School' },
  'Form 4': { nextGrade: '1st Year', nextLevel: 'Tertiary' },
  '1st Year': { nextGrade: '2nd Year', nextLevel: 'Tertiary' },
  '2nd Year': { nextGrade: '3rd Year', nextLevel: 'Tertiary' },
  '3rd Year': { nextGrade: '4th Year', nextLevel: 'Tertiary' },
  '4th Year': 'graduated',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const currentYear = new Date().getFullYear()

    // Get all active student beneficiaries with grades
    const { data: students, error: fetchError } = await supabase
      .from('beneficiaries')
      .select('id, organization_id, grade, academic_level, status')
      .eq('beneficiary_type', 'student')
      .in('status', ['active'])
      .not('grade', 'is', null)

    if (fetchError) throw fetchError

    let progressedCount = 0
    let graduatedCount = 0
    let skippedCount = 0

    for (const student of students || []) {
      // Skip Special School students
      if (student.academic_level === 'Special School') {
        skippedCount++
        continue
      }

      // Check if already progressed this year
      const { data: existing } = await supabase
        .from('beneficiary_progression_history')
        .select('id')
        .eq('beneficiary_id', student.id)
        .eq('academic_year', currentYear)
        .limit(1)

      if (existing && existing.length > 0) {
        skippedCount++
        continue
      }

      const progression = GRADE_PROGRESSION[student.grade]
      if (!progression) {
        skippedCount++
        continue
      }

      if (progression === 'graduated') {
        // Graduate the student
        await supabase
          .from('beneficiaries')
          .update({ status: 'graduated' })
          .eq('id', student.id)

        await supabase
          .from('beneficiary_progression_history')
          .insert({
            beneficiary_id: student.id,
            organization_id: student.organization_id,
            academic_year: currentYear,
            previous_academic_level: student.academic_level,
            previous_grade: student.grade,
            new_academic_level: 'Graduated',
            new_grade: 'Graduated',
            progression_type: 'automatic',
            notes: 'Automatically graduated after completing final year',
          })

        graduatedCount++
      } else {
        // Progress to next grade
        await supabase
          .from('beneficiaries')
          .update({
            grade: progression.nextGrade,
            academic_level: progression.nextLevel,
          })
          .eq('id', student.id)

        await supabase
          .from('beneficiary_progression_history')
          .insert({
            beneficiary_id: student.id,
            organization_id: student.organization_id,
            academic_year: currentYear,
            previous_academic_level: student.academic_level,
            previous_grade: student.grade,
            new_academic_level: progression.nextLevel,
            new_grade: progression.nextGrade,
            progression_type: 'automatic',
          })

        progressedCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: (students || []).length,
          progressed: progressedCount,
          graduated: graduatedCount,
          skipped: skippedCount,
          academic_year: currentYear,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Academic progression error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
