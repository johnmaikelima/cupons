import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ComparisonProduct } from '@/models/ComparisonProduct';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const skipParam = searchParams.get('skip');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const skip = skipParam ? parseInt(skipParam, 10) : 0;
    
    if (!query) {
      return NextResponse.json({ products: [] });
    }
    
    // Buscar produtos no banco de dados com os campos virtuais
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
    .skip(skip)
    // Importante: Garantir que os campos virtuais sejam incluídos
    .lean({ virtuals: true });
    
    // Processar cada produto e buscar preços da Amazon
    const processedProductsPromises = rawProducts.map(async (product) => {
      // Log para depuração
      console.log(`Processando produto: ${product.name}`);
      console.log('Campos virtuais:', product.currentPrice, product.bestStore);
      console.log('Estrutura de preços:', JSON.stringify(product.prices, null, 2));
      
      // Converter _id para string
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
          amazonPrice = {
            storeName: 'amazon',
            price: amazonData.price.price,
            url: amazonData.price.url,
            lastUpdate: amazonData.price.lastUpdate
          };
          console.log(`Preço da Amazon para ${product.name}:`, amazonPrice.price);
        }
      } catch (error) {
        console.error(`Erro ao buscar preço da Amazon para ${product.name}:`, error);
      }
      
      // Função para verificar se um preço é válido
      const isValidPrice = (price: any) => {
        return typeof price === 'number' && price > 0 && isFinite(price);
      };
      
      // Array para armazenar todos os preços válidos
      const validPrices: {store: string, price: number}[] = [];
      
      // Processar preços das lojas no produto
      if (product.prices && typeof product.prices === 'object') {
        Object.entries(product.prices).forEach(([storeName, storeData]: [string, any]) => {
          if (storeData && 
              typeof storeData === 'object' && 
              storeData.price && 
              isValidPrice(storeData.price)) {
            
            validPrices.push({
              store: storeName,
              price: storeData.price
            });
          }
        });
      }
      
      // Adicionar preço da Amazon se disponível
      if (amazonPrice) {
        validPrices.push({
          store: 'amazon',
          price: amazonPrice.price
        });
      }
      
      // Calcular o menor preço
      let lowestPrice = null;
      let bestStore = null;
      
      // Verificar se já temos o preço calculado pelo campo virtual
      if (product.currentPrice && product.currentPrice > 0) {
        lowestPrice = product.currentPrice;
        bestStore = product.bestStore;
        console.log(`Usando preço do campo virtual: ${lowestPrice}, loja: ${bestStore}`);
      }
      
      // Se não temos preço do campo virtual ou se temos preços válidos da Amazon
      if ((!lowestPrice || !bestStore) && validPrices.length > 0) {
        // Ordenar por preço (do menor para o maior)
        validPrices.sort((a, b) => a.price - b.price);
        
        // O primeiro item é o menor preço
        lowestPrice = validPrices[0].price;
        bestStore = validPrices[0].store;
        console.log(`Preço calculado manualmente: ${lowestPrice}, loja: ${bestStore}`);
      }
      
      return {
        ...processedProduct,
        amazonPrice,
        currentPrice: lowestPrice,
        bestStore: bestStore
      };
    });
    
    // Aguardar todas as promessas
    const processedProducts = await Promise.all(processedProductsPromises);
    
    // Ordenar por preço (produtos com preço primeiro, depois os sem preço)
    const sortedProducts = processedProducts.sort((a, b) => {
      if (a.currentPrice && b.currentPrice) {
        return a.currentPrice - b.currentPrice;
      } else if (a.currentPrice) {
        return -1; // a tem preço, b não tem
      } else if (b.currentPrice) {
        return 1; // b tem preço, a não tem
      } else {
        return 0; // nenhum tem preço
      }
    });
    
    return NextResponse.json({ products: sortedProducts });
  } catch (error) {
    console.error('Erro na busca de produtos com preços da Amazon:', error);
    return NextResponse.json({ error: 'Erro na busca de produtos' }, { status: 500 });
  }
}
