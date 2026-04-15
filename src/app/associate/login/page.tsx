import { redirect } from 'next/navigation';

/**
 * Legacy /associate/login route. Sign-in is unified at /signin?as=associate.
 * Permanent redirect preserves bookmarks and the public CTA on /.
 */
interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AssociateLoginRedirect({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const qs = new URLSearchParams({ as: 'associate' });
  if (next) qs.set('next', next);
  redirect(`/signin?${qs.toString()}`);
}
