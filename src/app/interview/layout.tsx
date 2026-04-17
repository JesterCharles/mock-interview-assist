import { AppShell } from '@/components/shell/AppShell';

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="mock">{children}</AppShell>;
}
