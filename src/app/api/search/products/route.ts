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
    const limit = limitParam ? parseInt(limitParam, 10) : 50; // Aumentado o limite padrão para 50
    const skip = skipParam ? parseInt(skipParam, 10) : 0;
    
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
    .skip(skip)
    .lean();
    
    // Função para verificar se um preço é válido
    const isValidPrice = (price: any) => {
      return typeof price === 'number' && price > 0 && isFinite(price);
    };
    
    // Processar cada produto para garantir que os preços sejam válidos
    const processedProducts = rawProducts.map(product => {
      // Converter _id para string
      const processedProduct = {
        ...product,
        _id: product._id.toString()
      };
      
      // Array para armazenar todos os preços válidos
      const validPrices: {store: string, price: number}[] = [];
      
      // Log detalhado da estrutura de preços
      console.log(`Produto: ${product.name}`);
      console.log('Estrutura de preços:', JSON.stringify(product.prices, null, 2));
      
      // Verificar se há preços e se é um objeto
      if (product.prices && typeof product.prices === 'object') {
        // Tentar acessar diretamente as lojas conhecidas
        const storeNames = ['amazon', 'kabum', 'magalu', 'terabyte', 'pichau'];
        
        storeNames.forEach(storeName => {
          const storeData = product.prices[storeName];
          console.log(`Loja ${storeName}:`, storeData);
          
          if (storeData && typeof storeData === 'object' && storeData.price) {
            console.log(`Preço em ${storeName}:`, storeData.price, 'Tipo:', typeof storeData.price);
            
            if (isValidPrice(storeData.price)) {
              console.log(`Preço válido em ${storeName}:`, storeData.price);
              validPrices.push({
                store: storeName,
                price: storeData.price
              });
            } else {
              console.log(`Preço inválido em ${storeName}:`, storeData.price);
            }
          }
        });
      }
      
      // Calcular o menor preço
      if (validPrices.length > 0) {
        // Ordenar por preço (do menor para o maior)
        validPrices.sort((a, b) => a.price - b.price);
        
        // Definir o menor preço e a melhor loja
        processedProduct.currentPrice = validPrices[0].price;
        processedProduct.bestStore = validPrices[0].store;
      } else {
        // Se não houver preços válidos
        processedProduct.currentPrice = null;
        processedProduct.bestStore = null;
      }
      
      return processedProduct;
    });
    
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
    
    console.log('API - Produtos processados:', sortedProducts.slice(0, 3).map(p => ({
      name: p.name,
      currentPrice: p.currentPrice,
      bestStore: p.bestStore
    })));
    
    return NextResponse.json({ products: sortedProducts });
  } catch (error) {
    console.error('Erro na busca de produtos:', error);
    return NextResponse.json({ error: 'Erro na busca de produtos' }, { status: 500 });
  }
}
