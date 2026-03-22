'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/store/admin';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false } } });

function Hydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useAdmin(s => s.hydrate);
  useEffect(() => { hydrate(); }, []);
  return <>{children}</>;
}

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => qc);
  return <QueryClientProvider client={client}><Hydrator>{children}</Hydrator></QueryClientProvider>;
}
