import React from 'react';
import ScrollToTopButton from '@/components/ScrollToTopButton';

export default function PlayLayout({
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
