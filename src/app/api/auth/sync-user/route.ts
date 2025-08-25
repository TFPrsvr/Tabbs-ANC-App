import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database/neon';
import { clerkHelpers } from '@/lib/auth/clerk';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let dbUser = await DatabaseService.getUserByClerkId(userId);

    if (!dbUser) {
      const userData = clerkHelpers.formatUserForDatabase(user);
      dbUser = await DatabaseService.createUser(
        userData.clerkId,
        userData.email,
        userData.name,
        userData.avatarUrl
      );
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: dbUser 
    });
  } catch (error) {
    console.error('Error syncing user:', error);
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

    const dbUser = await DatabaseService.getUserByClerkId(userId);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      user: dbUser 
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}