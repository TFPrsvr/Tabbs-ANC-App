import { ReactNode } from 'react';

// Force all dashboard routes to be dynamic
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
