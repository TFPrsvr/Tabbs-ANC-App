import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/database/neon';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync user first
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/sync-user`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userId}` }
    });
    
    // Get user and their audio files
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const files = await DatabaseService.getUserAudioFiles(user.id);
    return NextResponse.json({ files });

  } catch (error) {
    console.error('Error loading audio files:', error);
    return NextResponse.json({ error: 'Failed to load audio files' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const duration = Number(formData.get('duration')) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Sync user first
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/sync-user`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userId}` }
    });
    
    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upload audio file
    const audioFile = await DatabaseService.uploadAudioFile(
      user.id,
      file.name,
      file.name,
      file.size,
      duration,
      file.type.split('/')[1] || 'mp3',
      file.type,
      '' // file_url will be set when we implement file storage
    );

    if (!audioFile) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Track usage
    await DatabaseService.trackUsage(user.id, 'file_uploaded', {
      fileId: audioFile.id,
      fileName: file.name,
      fileSize: file.size,
      duration: duration
    });

    return NextResponse.json({ audioFile });

  } catch (error) {
    console.error('Error uploading audio file:', error);
    return NextResponse.json({ error: 'Failed to upload audio file' }, { status: 500 });
  }
}