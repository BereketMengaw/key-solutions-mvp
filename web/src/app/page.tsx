import { redirect } from 'next/navigation';
import { getViewer, homeFor } from '@/lib/auth';

export default async function Home() {
  const viewer = await getViewer();
  if (viewer.kind === 'signed-out') redirect('/login');
  redirect(viewer.kind === 'ok' ? homeFor(viewer.role) : '/stock');
}
