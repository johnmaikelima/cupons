'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IComparisonProduct } from '@/models/ComparisonProduct';

const storeDisplayNames: { [key: string]: string } = {
  amazon: 'Amazon',
  kabum: 'KaBuM!',
  magalu: 'Magazine Luiza',
  terabyte: 'Terabyte',
  pichau: 'Pichau',
};

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<IComparisonProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [productPrices, setProductPrices] = useState<{[key: string]: {price: number, store: string}}>({});
  const [loadingPrices, setLoadingPrices] = useState<{[key: string]: boolean}>({});

  const fetchProductPrices = useCallback(async (ean: string) => {
    try {
      const pricesResponse = await fetch(`/api/products/prices/${ean}`);
      const pricesData = await pricesResponse.json();
      const allPrices = pricesData.prices || [];
      const validPrices = allPrices.filter(p => p.price && p.price > 0 && !isNaN(p.price));

      if (validPrices.length > 0) {
        const lowestPriceItem = validPrices.reduce((lowest, current) => 
          current.price < lowest.price ? current : lowest, validPrices[0]);
        return {
          price: lowestPriceItem.price,
          store: lowestPriceItem.storeName
        };
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar preços para ${ean}:`, error);
      return null;
    }
  }, []);

  const fetchProducts = useCallback(async (loadMore = false) => {
    if (!query) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const resultsPerPage = 12;
      const currentPage = loadMore ? page + 1 : 1;
      const skip = (currentPage - 1) * resultsPerPage;

      const response = await fetch(
        `/api/search/products?q=${encodeURIComponent(query)}&limit=${resultsPerPage}&skip=${skip}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }

      const data = await response.json();
      const productsData = data.products || [];
      
      if (loadMore) {
        setProducts(prev => [...prev, ...productsData]);
      } else {
        setProducts(productsData);
      }
      
      setTotalProducts(data.total || 0);
      setHasMore(productsData.length >= resultsPerPage);
      if (loadMore) setPage(currentPage);

      const initialLoadingState: {[key: string]: boolean} = {};
      productsData.forEach(product => {
        initialLoadingState[product._id] = true;
      });
      setLoadingPrices(prev => ({...prev, ...initialLoadingState}));

      productsData.forEach(async (product: IComparisonProduct) => {
        try {
          const priceData = await fetchProductPrices(product.ean);
          if (priceData) {
            setProductPrices(prev => ({...prev, [product._id]: priceData}));
          }
        } finally {
          setLoadingPrices(prev => ({...prev, [product._id]: false}));
        }
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, page, fetchProductPrices]);

  useEffect(() => {
    fetchProducts();
  }, [query]);

  const loadMoreProducts = () => {
    fetchProducts(true);
  };

  if (loading && page === 1) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div className="text-red-500">Erro: {error}</div>;
  }

  if (products.length === 0 && !loading) {
    return <div>Nenhum produto encontrado para "{query}".</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <Link href={`/produtos/${product.slug || product._id}`} className="block">
              <Image
                src={product.images[0] || '/placeholder.png'}
                alt={product.name}
                width={300}
                height={300}
                className="w-full h-48 object-cover"
              />
            </Link>
            <div className="p-4 flex-grow flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  <Link href={`/produtos/${product.slug || product._id}`}>{product.name}</Link>
                </h3>
              </div>
              <div className="mt-4">
                {loadingPrices[product._id] ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : productPrices[product._id] ? (
                  <div className="text-lg font-bold text-blue-600">
                    R$ {productPrices[product._id].price.toFixed(2).replace('.', ',')}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Preço indisponível</div>
                )}
                {productPrices[product._id]?.store && (
                  <div className="text-xs text-gray-500 mt-1">
                    na {storeDisplayNames[productPrices[product._id].store] || productPrices[product._id].store}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMoreProducts}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Carregar mais resultados'}
          </button>
        </div>
      )}
    </div>
  );
}
