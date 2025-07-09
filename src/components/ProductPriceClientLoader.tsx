'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Carrega o componente da seção de preços dinamicamente, apenas no cliente.
const ProductPriceSection = dynamic(() => import('@/components/ProductPriceSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  ),
});

// Define as propriedades que o loader irá receber e repassar.
interface Props {
  ean: string;
  initialPrices: any[];
  currentPrice: number | null;
  productId: string;
  productName: string;
}

// O componente loader que será usado na página do servidor.
export default function ProductPriceClientLoader({ ean, initialPrices, currentPrice, productId, productName }: Props) {
  return (
    <Suspense fallback={
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    }>
      <ProductPriceSection
        ean={ean}
        initialPrices={initialPrices}
        currentPrice={currentPrice}
        productId={productId}
        productName={productName}
      />
    </Suspense>
  );
}
