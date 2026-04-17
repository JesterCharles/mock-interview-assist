import { redirect } from 'next/navigation';
import { getCallerIdentity } from '@/lib/identity';

export default async function ProfilePage() {
  const identity = await getCallerIdentity();

  if (identity.kind === 'anonymous') {
    redirect('/signin');
  }

  if (identity.kind === 'trainer' || identity.kind === 'admin') {
    redirect('/trainer');
  }

  if (identity.kind === 'associate') {
    if (identity.associateSlug) {
      redirect(`/associate/${identity.associateSlug}/dashboard`);
    }
    redirect('/');
  }

  redirect('/');
}
