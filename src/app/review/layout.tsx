import { AppShell } from '@/components/shell/AppShell';

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="mock">{children}</AppShell>;
}
