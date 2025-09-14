# ANC Audio App - Claude Project Memory

## Project Overview
- **Name**: ANC Audio Pro
- **Framework**: Next.js 15 with Turbopack
- **Type**: Progressive Web App (PWA)
- **Primary Features**: AI-powered audio processing, mobile-first design, offline functionality

## Development Environment
- **Node.js Version**: 20 (Alpine in Docker)
- **Package Manager**: npm
- **Dev Server**: `npm run dev` (uses Turbopack)
- **Build System**: Next.js build with Turbopack configuration
- **Docker**: Multi-stage production build with security hardening

## ⚡ Recent Optimizations (2025-09-13)
### Build System
- **Turbopack**: Properly configured with modern syntax (moved from experimental.turbo to turbopack config)
- **Memory Limit**: 4GB allocated for large project builds
- **File Handling**: Custom rules for audio/video files (.wav, .mp3, .ogg, .flac, .mp4, .webm, .mov)
- **Bundle Optimization**: Deterministic module ID strategy for consistent builds

### Docker Configuration
- **Multi-Stage Build**: Dependencies → Builder → Runner for optimized image size
- **Security**: Non-root user (nextjs:nodejs), security updates, proper permissions
- **Health Checks**: Automated health monitoring on port 3000
- **Production Ready**: Standalone output, dumb-init for proper signal handling

### Dependency Management
- **Removed Unused**: @radix-ui/react-dropdown-menu, @radix-ui/react-switch (saved ~3 packages)
- **Added Missing**: jszip, file-saver (for comprehensive media upload functionality)
- **Verified All**: 100% of remaining dependencies are actively used in codebase

### File Structure Cleanup
- **Empty Directories Removed**: 5 unused directories (src/app/api/dev/cleanup, src/lib/audio/codecs, etc.)
- **Duplicate Configs Removed**: next.config.ts (kept comprehensive next.config.js)
- **Ignore Files Updated**: Added CLAUDE.md to .vercelignore and .dockerignore

## Process Management Reminder
**IMPORTANT**: This project tends to accumulate multiple Node.js dev server processes. Always check for and terminate existing processes before starting development:

### Quick Cleanup Commands:
- **Windows**: `tasklist | findstr node` then `taskkill /F /PID [pid]`
- **Unix/Mac**: `ps aux | grep "next dev"` then `kill -9 [pid]`
- **Project Script**: `npm run dev:clean` (if process manager is installed)

### Before Starting Dev Server:
1. Check for existing Node processes
2. Kill any running dev servers
3. Start fresh with `npm run dev`
4. Remember to stop server when done (Ctrl+C)

## Key File Locations
- **Components**: `src/components/` (audio/, mobile/, ui/)
- **Pages**: `src/app/` (App Router structure)
- **Utilities**: `src/lib/`
- **Styles**: `src/app/globals.css` + Tailwind
- **Configuration**: `next.config.js`, `tailwind.config.ts`

## Mobile-First Architecture
- Automatic mobile detection in dashboard
- Separate mobile components in `src/components/mobile/`
- PWA manifest and service worker configured
- Offline-first audio processing capabilities

## Development Phases Completed
- **Phase 1**: Core audio processing and UI
- **Phase 2**: Video processing integration  
- **Phase 3**: Mobile PWA optimization
- **Phase 4**: Production deployment preparation

## Common Issues & Solutions
- **Build Errors**: Check for circular imports in next.config.js
- **Missing Dependencies**: Especially `sonner` for toast notifications
- **Mobile Testing**: Use browser dev tools device simulation
- **Process Conflicts**: Always clean up old dev servers first

## Deployment Targets
- **Primary**: Vercel (configured)
- **Secondary**: Netlify (configured)
- **Store**: Google Play Store (PWA assets ready)

## Remember
- Always use mobile-first responsive design
- Keep process management in mind during development
- Test PWA functionality regularly
- Follow established component patterns