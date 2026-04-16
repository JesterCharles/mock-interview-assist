import { TopBar } from '@/components/shell/TopBar'

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
