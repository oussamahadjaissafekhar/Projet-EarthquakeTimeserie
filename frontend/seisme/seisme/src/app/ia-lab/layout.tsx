'use client';

import Layout from '../components/Layout';

export default function IALabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
