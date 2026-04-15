import { redirect } from 'next/navigation';

/**
 * Legacy /login route. Sign-in is unified at /signin (Trainer + Associate
 * tabs). Permanent redirect preserves bookmarks and internal callers.
 */
export default function LoginRedirect() {
  redirect('/signin?as=trainer');
}
