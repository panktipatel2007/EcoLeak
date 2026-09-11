import { TopNav } from '@/components/ecoleak/top-nav'
import { EcoLeakApp } from '@/components/ecoleak/ecoleak-app'

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <EcoLeakApp />
      </main>
    </div>
  )
}
