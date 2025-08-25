"use client";

import { useAuth, useUser } from '@clerk/nextjs';
// Database operations now handled via API routes
import { User } from '../../types';

export function useAuthenticatedUser() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const syncUserWithDatabase = async (): Promise<User | null> => {
    if (!isSignedIn || !userId || !user) return null;

    try {
      // Use the API route to sync user
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST'
      });
      
      if (response.ok) {
        const { user: dbUser } = await response.json();
        return dbUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error syncing user with database:', error);
      return null;
    }
  };

  return {
    isSignedIn,
    userId,
    user,
    syncUserWithDatabase,
  };
}

export function useUserSubscription() {
  const { userId } = useAuth();

  const checkSubscriptionLimits = async (fileSize: number, fileDuration: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/auth/check-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileSize,
          fileDuration,
        }),
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      return result.canUpload;
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      return false;
    }
  };

  const getUserPlan = async () => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/auth/user-plan');
      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user plan:', error);
      return null;
    }
  };

  return {
    checkSubscriptionLimits,
    getUserPlan,
  };
}

interface ClerkUser {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  profileImageUrl?: string;
  emailAddresses?: Array<{ emailAddress: string }>;
  email?: string;
  id: string;
}

export const clerkHelpers = {
  getUserDisplayName: (user: ClerkUser): string => {
    if (user?.fullName) return user.fullName;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    return 'User';
  },

  getUserAvatarUrl: (user: ClerkUser): string => {
    return user?.imageUrl || user?.profileImageUrl || '';
  },

  getUserEmail: (user: ClerkUser): string => {
    return user?.emailAddresses?.[0]?.emailAddress || user?.email || '';
  },

  formatUserForDatabase: (clerkUser: ClerkUser) => ({
    clerkId: clerkUser.id,
    email: clerkHelpers.getUserEmail(clerkUser),
    name: clerkHelpers.getUserDisplayName(clerkUser),
    avatarUrl: clerkHelpers.getUserAvatarUrl(clerkUser),
  }),
};