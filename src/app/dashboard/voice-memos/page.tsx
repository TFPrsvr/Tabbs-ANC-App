'use client';

import { VoiceMemoManager } from '@/components/audio/voice-memos';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering to ensure lambda creation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function VoiceMemosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Voice Memo Manager */}
      <div className="max-w-7xl mx-auto">
        <VoiceMemoManager />
      </div>
    </div>
  );
}
