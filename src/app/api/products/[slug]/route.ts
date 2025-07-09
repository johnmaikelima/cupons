import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ComparisonProduct } from '@/models/ComparisonProduct';

export async function GET(
  request: Request,
  context: { params: { slug: string } }
) {
  try {
    await connectDB();
    const product = await ComparisonProduct.findOne({ slug: context.params.slug }).lean();

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Filtrar os preços para manter apenas os que foram adicionados manualmente
    if (product.prices) {
      const filteredPrices: any = {};
      for (const store in product.prices) {
        // @ts-ignore
        if (product.prices[store] && !product.prices[store].lastImportId) {
          // @ts-ignore
          filteredPrices[store] = product.prices[store];
        }
      }
      product.prices = filteredPrices;
    } else {
      product.prices = {}; // Deve ser um objeto, não um array
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}
