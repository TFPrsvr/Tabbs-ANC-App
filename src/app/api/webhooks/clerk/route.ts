import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { DatabaseService } from '@/lib/database/neon';
import { clerkHelpers } from '@/lib/auth/clerk';

interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | 'session.created' | 'session.ended';
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    username?: string;
    image_url?: string;
    profile_image_url?: string;
  };
}

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local');
}

export async function POST(req: NextRequest) {
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(webhookSecret);

  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json({ error: 'Error verifying webhook' }, { status: 400 });
  }

  const { id, type, data } = evt;
  console.log(`Webhook received: ${type} for user ${id}`);

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      case 'session.created':
        await handleSessionCreated(data);
        break;
      default:
        console.log(`Unhandled webhook event: ${type}`);
    }
  } catch (error) {
    console.error(`Error handling webhook ${type}:`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function handleUserCreated(data: ClerkWebhookEvent['data']) {
  const userData = clerkHelpers.formatUserForDatabase(data);
  
  const user = await DatabaseService.createUser(
    userData.clerkId,
    userData.email,
    userData.name,
    userData.avatarUrl
  );

  if (user) {
    await DatabaseService.trackUsage(
      user.id,
      'user_registered',
      { 
        source: 'clerk_webhook',
        userAgent: data.unsafe_metadata?.userAgent 
      }
    );
    console.log(`Created user: ${user.email}`);
  }
}

async function handleUserUpdated(data: ClerkWebhookEvent['data']) {
  const userData = clerkHelpers.formatUserForDatabase(data);
  
  // Note: You'd need to implement updateUser method in DatabaseService
  console.log(`User updated: ${userData.clerkId}`);
  
  // Track user profile update
  const user = await DatabaseService.getUserByClerkId(userData.clerkId);
  if (user) {
    await DatabaseService.trackUsage(
      user.id,
      'profile_updated',
      { 
        changes: {
          name: userData.name,
          email: userData.email,
          avatar: userData.avatarUrl
        }
      }
    );
  }
}

async function handleUserDeleted(data: ClerkWebhookEvent['data']) {
  const clerkId = data.id;
  
  // Get user before deletion for tracking
  const user = await DatabaseService.getUserByClerkId(clerkId);
  
  if (user) {
    await DatabaseService.trackUsage(
      user.id,
      'user_deleted',
      { 
        deletedAt: new Date().toISOString(),
        clerkId 
      }
    );
    
    // Note: Due to CASCADE constraints, user deletion will automatically 
    // clean up related records (audio_files, subscriptions, etc.)
    console.log(`User deleted: ${user.email}`);
  }
}

async function handleSessionCreated(data: { user_id: string; [key: string]: unknown }) {
  const clerkId = data.user_id;
  
  const user = await DatabaseService.getUserByClerkId(clerkId);
  if (user) {
    await DatabaseService.trackUsage(
      user.id,
      'session_created',
      { 
        sessionId: data.id,
        loginAt: new Date(data.created_at).toISOString()
      }
    );
  }
}