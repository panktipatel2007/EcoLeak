/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TopNav } from './components/ecoleak/top-nav';
import { EcoLeakApp } from './components/ecoleak/ecoleak-app';
import { OpeningHero } from './components/ecoleak/opening-hero';
import { AuthModal } from './components/ecoleak/auth-modal';
import { AuthProvider, useAuth } from './lib/auth-context';
import { UserPlus, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

function MainLayout() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<'hero' | 'app'>('hero');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  function handleOpenLogin(mode: 'signin' | 'signup' = 'signin') {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  function handleLoginSuccess() {
    setAuthModalOpen(false);
    setCurrentPage('app');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-700">
      <TopNav
        onGoHome={() => setCurrentPage('hero')}
        onOpenAuth={(mode) => handleOpenLogin(mode)}
      />

      <main className="mx-auto max-w-6xl w-full px-4 py-4 sm:px-6 sm:py-6 flex-1">
        {currentPage === 'hero' ? (
          <OpeningHero
            onOpenLogin={handleOpenLogin}
            onExploreDemo={() => setCurrentPage('app')}
          />
        ) : (
          <div className="space-y-4">
            {/* Top Bar for Guest & App Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <button
                type="button"
                onClick={() => setCurrentPage('hero')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Opening Page</span>
              </button>

              {/* Guest banner with small signup button */}
              {!user ? (
                <div className="flex items-center gap-2.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3.5 py-1.5 shadow-xs">
                  <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                    Browsing as <strong>Guest</strong> (drafts auto-saved)
                  </span>
                  <button
                    type="button"
                    id="guest-top-signup-btn"
                    onClick={() => handleOpenLogin('signup')}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-xs transition-all hover:scale-105"
                  >
                    <UserPlus className="size-3" />
                    <span>Sign Up &amp; Save</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>Cloud Sync Active · History Enabled</span>
                </div>
              )}
            </div>

            <EcoLeakApp />
          </div>
        )}
      </main>

      {/* Global Big Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        defaultMode={authMode}
        onClose={handleLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
