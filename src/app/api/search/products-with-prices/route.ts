import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ComparisonProduct } from '@/models/ComparisonProduct';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50; // Aumentado o limite padrão para 50
    
    if (!query) {
      return NextResponse.json({ products: [] });
    }
    
    // Buscar produtos no banco de dados
    const rawProducts = await ComparisonProduct.find(
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { ean: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }
    )
    .limit(limit)
    .lean();
    
    // Processar os produtos com preços da Amazon
    const processedProductsPromises = rawProducts.map(async (product) => {
      // Converter o _id para string
      const processedProduct = {
        ...product,
        _id: product._id.toString()
      };
      
      // Buscar preços da Amazon
      let amazonPrice = null;
      try {
        const amazonResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/amazon-comparison/${product.ean}`);
        const amazonData = await amazonResponse.json();
        if (amazonData.price && amazonData.price.price > 0) {
          amazonPrice = amazonData.price;
        }
      } catch (error) {
        console.error(`Erro ao buscar preço da Amazon para ${product.name}:`, error);
      }
      
      // Combinar todos os preços
      const allPrices = [
        ...(product.prices ? Object.values(product.prices) : []),
        ...(amazonPrice ? [amazonPrice] : [])
      ];
      
      // Filtrar preços válidos
      const validPrices = allPrices.filter(p => p && p.price && p.price > 0);
      
      // Calcular o melhor preço
      let bestPrice = null;
      let bestStore = null;
      
      if (validPrices.length > 0) {
        // Encontrar o menor preço
        const lowestPriceItem = validPrices.reduce((min, current) => 
          (current.price < min.price) ? current : min, validPrices[0]);
        
        bestPrice = lowestPriceItem.price;
        bestStore = lowestPriceItem.storeName;
      }
      
      // Adicionar informações de preço ao produto
      return {
        ...processedProduct,
        bestPrice,
        bestStore
      };
    });
    
    // Aguardar todas as promessas
    const processedProducts = await Promise.all(processedProductsPromises);
    
    // Ordenar por preço (produtos com preço primeiro, depois os sem preço)
    const sortedProducts = processedProducts.sort((a, b) => {
      if (a.bestPrice && b.bestPrice) {
        return a.bestPrice - b.bestPrice;
      } else if (a.bestPrice) {
        return -1; // a tem preço, b não tem
      } else if (b.bestPrice) {
        return 1; // b tem preço, a não tem
      } else {
        return 0; // nenhum tem preço
      }
    });
    
    return NextResponse.json({ products: sortedProducts });
  } catch (error) {
    console.error('Erro na busca de produtos com preços:', error);
    return NextResponse.json({ error: 'Erro na busca de produtos' }, { status: 500 });
  }
}
