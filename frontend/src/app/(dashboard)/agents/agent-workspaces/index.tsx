'use client';

import React from 'react';
import { FashionWorkspace } from './fashion';
import { HomeWorkspace } from './home';
import { FinanceWorkspace } from './finance';
import { LifestyleWorkspace } from './lifestyle';
import { InstagramWorkspace } from './instagram';

export function AgentWorkspace({ agentId }: { agentId: string }) {
  switch (agentId) {
    case 'fashion':
      return <FashionWorkspace />;
    case 'home':
      return <HomeWorkspace />;
    case 'finance':
      return <FinanceWorkspace />;
    case 'lifestyle':
      return <LifestyleWorkspace />;
    case 'instagram-admin':
      return <InstagramWorkspace />;
    default:
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
          <p>فضای کار برای این دستیار تعریف نشده است.</p>
        </div>
      );
  }
}
