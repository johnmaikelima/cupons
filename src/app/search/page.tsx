'use client';

import { Suspense } from 'react';
import SearchResults from '@/components/SearchResults';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Carregando...</div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
