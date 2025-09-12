"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Home, 
  Upload, 
  Wand2, 
  Search, 
  Settings, 
  Menu, 
  X,
  User,
  History,
  HelpCircle 
} from 'lucide-react';
import { GestureHandler } from '@/lib/mobile/gestures';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  isActive?: boolean;
}

interface MobileNavigationProps {
  className?: string;
}

export function MobileNavigation({ className }: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const menuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Main navigation items
  const mainNavItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: Home,
      href: '/dashboard',
      isActive: pathname === '/dashboard'
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: Upload,
      href: '/dashboard?tab=upload',
      isActive: pathname === '/dashboard' && window.location.search.includes('upload')
    },
    {
      id: 'process',
      label: 'Process',
      icon: Wand2,
      href: '/dashboard?tab=processor',
      badge: 2, // Example: 2 files ready for processing
      isActive: pathname === '/dashboard' && window.location.search.includes('processor')
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      href: '/search',
      isActive: pathname === '/search'
    }
  ];

  // Secondary navigation items (in menu)
  const menuNavItems: NavigationItem[] = [
    {
      id: 'history',
      label: 'History',
      icon: History,
      href: '/dashboard?tab=history'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings'
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      href: '/help'
    }
  ];

  // Initialize gesture handling for menu
  useEffect(() => {
    if (menuRef.current) {
      const handler = new GestureHandler(menuRef.current, {
        preventScroll: false,
      });

      handler.on('swipe', (event) => {
        if (event.direction === 'right' && isMenuOpen) {
          setIsMenuOpen(false);
        } else if (event.direction === 'left' && !isMenuOpen) {
          setIsMenuOpen(true);
        }
      });

      return () => handler.destroy();
    }
  }, [isMenuOpen]);

  // Handle overlay tap to close menu
  useEffect(() => {
    if (overlayRef.current && isMenuOpen) {
      const handler = new GestureHandler(overlayRef.current, {
        preventScroll: false,
      });

      handler.on('tap', () => {
        setIsMenuOpen(false);
      });

      return () => handler.destroy();
    }
  }, [isMenuOpen]);

  const handleNavigation = (item: NavigationItem) => {
    setActiveTab(item.id);
    router.push(item.href);
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <Card 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
          className
        )}
      >
        <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
          {mainNavItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item)}
              className={cn(
                "flex-col gap-1 h-auto py-2 px-3 min-w-0 touch-manipulation relative",
                "hover:bg-transparent active:bg-purple-100 dark:active:bg-purple-900/30",
                item.isActive && "text-purple-600 dark:text-purple-400"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative">
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  item.isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
                )} />
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium transition-colors",
                item.isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
              )}>
                {item.label}
              </span>
              
              {/* Active Indicator */}
              {item.isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full" />
              )}
            </Button>
          ))}

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMenu}
            className={cn(
              "flex-col gap-1 h-auto py-2 px-3 min-w-0 touch-manipulation",
              "hover:bg-transparent active:bg-purple-100 dark:active:bg-purple-900/30",
              isMenuOpen && "text-purple-600 dark:text-purple-400"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
            <span className={cn(
              "text-xs font-medium transition-colors",
              isMenuOpen ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
            )}>
              Menu
            </span>
          </Button>
        </div>
      </Card>

      {/* Slide-out Menu */}
      <div 
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 ease-in-out",
          isMenuOpen ? "visible" : "invisible"
        )}
      >
        {/* Overlay */}
        <div 
          ref={overlayRef}
          className={cn(
            "absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
            isMenuOpen ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Menu Panel */}
        <div 
          ref={menuRef}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-out",
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Menu Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🎵 ANC Audio Pro
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-Powered Audio Processing
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMenu}
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-4">
            {menuNavItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => handleNavigation(item)}
                className={cn(
                  "w-full justify-start gap-3 px-6 py-4 h-auto text-left font-normal touch-manipulation",
                  "hover:bg-purple-50 dark:hover:bg-purple-900/20 active:bg-purple-100 dark:active:bg-purple-900/30"
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getItemDescription(item.id)}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Menu Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <p>Version 1.0.0 • PWA Enabled</p>
              <p className="mt-1">Swipe right to close menu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Area Spacer for Bottom Navigation */}
      <div className="h-20 w-full" /> {/* Spacer to prevent content from being hidden behind nav */}
    </>
  );
}

// Helper function to get item descriptions
function getItemDescription(itemId: string): string {
  const descriptions: Record<string, string> = {
    history: 'View your processed files',
    profile: 'Manage your account',
    settings: 'App preferences',
    help: 'Get support & tutorials'
  };
  
  return descriptions[itemId] || '';
}