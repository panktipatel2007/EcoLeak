/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TopNav } from './components/ecoleak/top-nav';
import { EcoLeakApp } from './components/ecoleak/ecoleak-app';
import { AuthProvider } from './lib/auth-context';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        <TopNav />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <EcoLeakApp />
        </main>
      </div>
    </AuthProvider>
  );
}

