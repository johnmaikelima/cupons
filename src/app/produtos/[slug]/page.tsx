import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import dynamic from "next/dynamic";
import { connectDB } from '@/lib/mongodb';
import { ComparisonProduct, IComparisonProduct } from '@/models/ComparisonProduct';

import ProductPriceClientLoader from '@/components/ProductPriceClientLoader';
const PriceHistory = dynamic(() => import('@/components/PriceHistory'));
const ShopeeRecommendations = dynamic(() => import('@/components/ShopeeRecommendations'));
const AmazonRecommendations = dynamic(() => import('@/components/AmazonRecommendations'));

interface Props {
  params: { slug: string };
}

async function getProduct(slug: string) {
  try {
    await connectDB();
    // Busca o produto e o retorna com o tipo correto, sem processamento adicional.
    const product = await ComparisonProduct.findOne({ slug }).lean<IComparisonProduct>();
    return product;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }
}

export default async function ProductPage(context: Props) {
  const product = await getProduct(context.params.slug);

  if (!product) {
    notFound();
  }

  // A lógica de processamento de preços agora vive dentro do componente da página.
  let amazonPrice = null;
  try {
    const amazonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/amazon-comparison/${product.ean}`);
    const amazonData = await amazonResponse.json();
    if (amazonData.price && amazonData.price.price > 0) {
      amazonPrice = amazonData.price;
    }
  } catch (error) {
    console.error('Erro ao buscar preço da Amazon:', error);
  }

  const existingPrices = product.prices ? Object.values(product.prices).filter(Boolean) : [];
  const allPrices = [
    ...existingPrices,
    ...(amazonPrice ? [amazonPrice] : [])
  ];

  const bestPrice = allPrices.length > 0
    ? allPrices.reduce((min, p) => p.price < min ? p.price : min, allPrices[0].price)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Card principal com informações do produto */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            {/* Título do produto - aparece primeiro no mobile */}
            <div className="md:hidden">
              <h1 className="text-lg font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
            </div>

            {/* Coluna da imagem */}
            <div>
              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={product.images[0] || '/placeholder.jpg'}
                  alt={product.name}
                  width={800}
                  height={800}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Coluna das informações */}
            <div>
              {/* Título aparece aqui apenas no desktop */}
              <h1 className="hidden md:block text-2xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>

              <div className="space-y-4">
                {product.ean && (
                  <p className="text-gray-600">
                    <span className="font-semibold">EAN:</span> {product.ean}
                  </p>
                )}

                {/* Preços */}
                <div className="mt-6">
                  <ProductPriceClientLoader
                    ean={product.ean}
                    initialPrices={allPrices}
                    currentPrice={bestPrice}
                    productId={product._id.toString()}
                    productName={product.name}
                  />
                </div>

                {/* Especificações Técnicas */}
                {product.technicalSpecs && product.technicalSpecs.size > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Especificações Técnicas</h2>
                    <dl className="grid grid-cols-1 gap-4">
                      {Array.from(product.technicalSpecs.entries()).map(([key, value]) => (
                        <div key={key} className="border-b border-gray-200 pb-2">
                          <dt className="font-semibold text-gray-700">{key}</dt>
                          <dd className="text-gray-600">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Descrição do Produto */}
        {product.description && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
            <h2 className="text-xl font-semibold mb-4">Descrição do Produto</h2>
            <div className="prose max-w-none">
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          </div>
        )}

        {/* Histórico de Preços */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Histórico de Preços</h2>
          <Suspense fallback={<div>Carregando histórico...</div>}>
            <PriceHistory ean={product.ean} />
          </Suspense>
        </div>

        {/* Card de recomendações da Amazon */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <Suspense fallback={<div>Carregando recomendações...</div>}>
            <AmazonRecommendations productName={product.name} />
          </Suspense>
        </div>

        {/* Card de recomendações da Shopee */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <Suspense fallback={<div>Carregando recomendações...</div>}>
            <ShopeeRecommendations productName={product.name} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
