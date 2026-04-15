import { redirect } from 'next/navigation';

/**
 * Legacy /dashboard route. Renamed to /interview/new (the route IS the
 * interview setup wizard). Kept as a permanent redirect so old bookmarks
 * and internal router.push('/dashboard') calls continue to work.
 */
export default function DashboardLegacyRedirect() {
  redirect('/interview/new');
}
