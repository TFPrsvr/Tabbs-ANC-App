import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/database/neon';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioFileId, streams } = await req.json();

    if (!audioFileId || !streams) {
      return NextResponse.json({ error: 'Missing audioFileId or streams' }, { status: 400 });
    }

    // Create audio streams
    const createdStreams = await DatabaseService.createAudioStreams(audioFileId, streams);
    
    return NextResponse.json({ streams: createdStreams });

  } catch (error) {
    console.error('Error creating audio streams:', error);
    return NextResponse.json({ error: 'Failed to create audio streams' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId, updates } = await req.json();

    if (!streamId || !updates) {
      return NextResponse.json({ error: 'Missing streamId or updates' }, { status: 400 });
    }

    // Update audio stream
    const updatedStream = await DatabaseService.updateAudioStream(streamId, updates);
    
    return NextResponse.json({ stream: updatedStream });

  } catch (error) {
    console.error('Error updating audio stream:', error);
    return NextResponse.json({ error: 'Failed to update audio stream' }, { status: 500 });
  }
}