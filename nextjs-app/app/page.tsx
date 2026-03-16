'use client';

import dynamic from 'next/dynamic';

const HomeScreen = dynamic(() => import('@/components/custom/HomeScreen'), { ssr: false });

export default function Page() {
  return <HomeScreen />;
}
