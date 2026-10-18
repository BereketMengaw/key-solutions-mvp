import { redirect } from 'next/navigation';
import { AppFrame } from '@/components/AppFrame';
import { getViewer } from '@/lib/auth';
import { isWebRole } from '@/lib/roles';
import { StockProvider } from '@/lib/stock/StockProvider';
import { FrameError } from './FrameError';

/** Every page in here is for manager / owner only — checked on the server on every request. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer.kind === 'signed-out') redirect('/login');
  if (viewer.kind === 'error') {
    return (
      <StockProvider>
        <AppFrame user={null}>
          <FrameError />
        </AppFrame>
      </StockProvider>
    );
  }
  if (!isWebRole(viewer.role) || !viewer.role) redirect('/wrong-role');

  return (
    <StockProvider>
      <AppFrame user={{ fullName: viewer.fullName, email: viewer.email, role: viewer.role }}>{children}</AppFrame>
    </StockProvider>
  );
}
