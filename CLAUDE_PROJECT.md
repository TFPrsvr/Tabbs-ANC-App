# ANC Audio App - Claude Project Memory

## Project Overview
- **Name**: ANC Audio Pro
- **Framework**: Next.js 15 with Turbopack
- **Type**: Progressive Web App (PWA)
- **Primary Features**: AI-powered audio processing, mobile-first design, offline functionality

## Development Environment
- **Node.js Version**: Latest stable
- **Package Manager**: npm
- **Dev Server**: `npm run dev` (uses Turbopack)
- **Build System**: Next.js build with custom webpack config

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