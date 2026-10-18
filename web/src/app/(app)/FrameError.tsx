'use client';

import { useRouter } from 'next/navigation';
import { Button, EmptyState } from '@/components/ui';
import { s } from '@/lib/strings';

/** The server couldn't read the profile (network): the frame shows, the content offers a retry. */
export function FrameError() {
  const router = useRouter();
  return (
    <div className="bg-surface border border-border rounded-xl py-16 px-6">
      <EmptyState
        error
        icon="cloud-offline-outline"
        title={s.common.cantReach}
        body={s.common.checkConnection}
        action={
          <Button variant="secondary" onClick={() => router.refresh()}>
            {s.common.tryAgain}
          </Button>
        }
      />
    </div>
  );
}
