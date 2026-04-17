import { AppShell } from '@/components/shell/AppShell'

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
