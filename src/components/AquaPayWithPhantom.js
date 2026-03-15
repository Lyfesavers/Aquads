import React from 'react';
import { PhantomProvider } from '@phantom/react-sdk';
import { AddressType } from '@phantom/browser-sdk';
import AquaPayPage from './AquaPayPage';

/**
 * Wraps AquaPayPage with PhantomProvider so the pay page can use Phantom SDK
 * (deeplink on mobile when no injected wallet). Isolated to AquaPay only.
 */
export default function AquaPayWithPhantom({ currentUser }) {
  const appId = process.env.REACT_APP_PHANTOM_APP_ID;
  return (
    <PhantomProvider
      config={{
        appId: appId || undefined,
        providers: ['injected', 'deeplink'],
        addressTypes: [AddressType.solana],
      }}
    >
      <AquaPayPage currentUser={currentUser} />
    </PhantomProvider>
  );
}
