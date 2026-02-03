export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function POST(request: NextRequest) {
  try {

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('❌ [API] No file found in FormData')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }



    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `avatars/${fileName}`



    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.warn(`⚠️ [API] Upload failed initially: ${uploadError.message}`)

      if (uploadError) {
        console.warn(`⚠️ [API] Upload failed initially: ${uploadError.message}`)

        // Attempt to create bucket on ANY error (robust fallback)

        const { data, error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/*']
        })

        if (createError) {
          // If it already exists, just proceed to retry (maybe permissions issue resolved?)
          // But if it's a real error, log it.
          if (!createError.message.includes('already exists')) {
            console.error(`❌ [API] Failed to create bucket: ${createError.message}`)
          } else {

          }
        }

        // Retry upload

        const { error: retryError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (retryError) {
          console.error(`❌ [API] Retry failed: ${retryError.message}`)
          throw retryError
        }
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)



    return NextResponse.json({
      success: true,
      url: publicUrl
    })

  } catch (error: any) {
    console.error('❌ [API] Unexpected upload error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to upload file',
      details: error
    }, { status: 500 })
  }
}
