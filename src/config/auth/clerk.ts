export const clerkConfig = {
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  secretKey: process.env.CLERK_SECRET_KEY!,
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
  afterSignInUrl: '/dashboard',
  afterSignUpUrl: '/onboarding',
};

export const clerkTheme = {
  layout: {
    socialButtonsVariant: 'iconButton',
    socialButtonsPlacement: 'bottom',
  },
  variables: {
    colorPrimary: '#8B5CF6',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#1f2937',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorDanger: '#ef4444',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    borderRadius: '0.75rem',
    fontFamily: 'system-ui, sans-serif',
  },
};

export const clerkDarkTheme = {
  ...clerkTheme,
  variables: {
    ...clerkTheme.variables,
    colorBackground: '#0f0f23',
    colorInputBackground: '#1e1b4b',
    colorInputText: '#e2e8f0',
    colorText: '#e2e8f0',
    colorTextSecondary: '#94a3b8',
  },
};