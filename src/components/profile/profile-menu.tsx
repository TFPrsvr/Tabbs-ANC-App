"use client";

import { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Settings,
  CreditCard,
  FileText,
  LogOut,
  Crown,
  Shield,
  Music,
  BarChart3,
  HelpCircle
} from 'lucide-react';

interface ProfileMenuProps {
  children?: React.ReactNode;
}

export function ProfileMenu({ children }: ProfileMenuProps) {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U';

  const isPremium = user?.publicMetadata?.subscription === 'premium';
  const isAdmin = user?.publicMetadata?.role === 'admin';

  const handleSignOut = () => {
    signOut(() => window.location.href = '/');
  };

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User'} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {isPremium && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user?.fullName || 'User'}</p>
              <div className="flex gap-1">
                {isPremium && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro
                  </Badge>
                )}
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 border-red-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music className="w-3 h-3" />
              <span>5 files processed this month</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => openUserProfile()}>
          <User className="mr-2 h-4 w-4" />
          <span>👤 Profile Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setIsMenuOpen(false)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>📊 Usage Analytics</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setIsMenuOpen(false)}>
          <FileText className="mr-2 h-4 w-4" />
          <span>📁 My Audio Files</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => setIsMenuOpen(false)}>
          <CreditCard className="mr-2 h-4 w-4" />
          <div className="flex items-center justify-between w-full">
            <span>💳 Subscription</span>
            {isPremium ? (
              <Badge variant="outline" className="ml-2 text-xs">Premium</Badge>
            ) : (
              <Badge variant="secondary" className="ml-2 text-xs">Free</Badge>
            )}
          </div>
        </DropdownMenuItem>

        {!isPremium && (
          <DropdownMenuItem onClick={() => setIsMenuOpen(false)}>
            <Crown className="mr-2 h-4 w-4" />
            <span>⭐ Upgrade to Pro</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => setIsMenuOpen(false)}>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>❓ Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setIsMenuOpen(false)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>⚙️ App Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>🚪 Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}