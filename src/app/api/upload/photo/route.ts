import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Generate photo hash (SHA-256 mock)
    const arrayBuffer = await photo.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const photoHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // In production: Upload to Cloudflare R2
    // const r2Client = new S3Client({
    //   region: 'auto',
    //   endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    //   credentials: {
    //     accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    //   },
    // });
    // const key = `photos/${Date.now()}_${photo.name}`;
    // await r2Client.send(new PutObjectCommand({
    //   Bucket: process.env.R2_BUCKET_NAME,
    //   Key: key,
    //   Body: Buffer.from(arrayBuffer),
    //   ContentType: photo.type,
    // }));
    // const photoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    // Mock R2 URL
    const photoUrl = `https://r2.bel-sentinel.dev/photos/${Date.now()}_${photo.name}`;

    return NextResponse.json({
      photoUrl,
      photoHash,
      size: photo.size,
      type: photo.type,
    });
  } catch {
    return NextResponse.json({ error: 'Photo upload failed' }, { status: 500 });
  }
}
