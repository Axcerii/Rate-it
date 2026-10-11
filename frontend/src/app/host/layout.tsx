import React from 'react';
import ScrollToTopButton from '@/components/ScrollToTopButton';

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ScrollToTopButton />
    </>
  );
}
