import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database/neon';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileSize, fileDuration } = await request.json();

    if (!fileSize || !fileDuration) {
      return NextResponse.json(
        { error: 'File size and duration are required' }, 
        { status: 400 }
      );
    }

    const canUpload = await DatabaseService.canUserUploadFile(userId, fileSize, fileDuration);

    return NextResponse.json({ 
      success: true, 
      canUpload 
    });
  } catch (error) {
    console.error('Error in check-limits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await DatabaseService.getUserByClerkId(userId);
    const subscription = user ? await DatabaseService.getUserSubscription(user.id) : null;

    return NextResponse.json({ 
      success: true, 
      subscription 
    });
  } catch (error) {
    console.error('Error in check-limits GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}