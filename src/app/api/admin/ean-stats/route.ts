import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  // Obter parâmetros da URL
  const { searchParams } = new URL(request.url);
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : 0;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const showAll = searchParams.get('showAll') === 'true';
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    // Agregação para contar quantas lojas diferentes existem para cada EAN
    const result = await collection.aggregate([
      // Agrupar por EAN
      { $group: { 
        _id: "$ean", 
        count: { $sum: 1 },
        lojas: { $addToSet: "$merchant_name" },
        produtos: { $push: { 
          merchant_name: "$merchant_name", 
          store_price: "$store_price",
          in_stock: "$in_stock"
        }}
      }},
      // Filtrar apenas EANs com mais de uma loja
      { $match: { count: { $gt: 1 } } },
      // Ordenar por quantidade de lojas (decrescente)
      { $sort: { count: -1 } },
      // Limitar a 100 resultados para não sobrecarregar
      { $limit: 100 }
    ]).toArray();
    
    // Estatísticas gerais
    const totalStats = await collection.aggregate([
      { $group: { 
        _id: null, 
        totalProdutos: { $sum: 1 },
        uniqueEANs: { $addToSet: "$ean" }
      }}
    ]).toArray();
    
    // Contagem de EANs com múltiplas lojas
    const multipleStoresCount = await collection.aggregate([
      { $group: { _id: "$ean", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "total" }
    ]).toArray();
    
    // Produtos filtrados por faixa de preço
    const matchCondition: any = { store_price: { $gte: minPrice } };
    
    // Adicionar filtro de preço máximo se especificado
    if (maxPrice !== undefined) {
      matchCondition.store_price.$lte = maxPrice;
    }
    
    const aggregationPipeline: any[] = [
      // Filtrar por faixa de preço
      { $match: matchCondition },
      // Ordenar por preço (decrescente)
      { $sort: { store_price: -1 } },
    ];
    
    // Limitar resultados apenas se não for solicitado mostrar todos
    if (!showAll) {
      aggregationPipeline.push({ $limit: 100 });
    }
    
    // Adicionar projeção de campos
    aggregationPipeline.push(
      { $project: {
        _id: 1,
        ean: 1,
        product_name: 1,
        merchant_name: 1,
        store_price: 1,
        merchant_product_id: 1,
        in_stock: 1,
        aw_deep_link: 1
      }}
    );
    
    const produtosMaisCaros = await collection.aggregate(aggregationPipeline).toArray();
    
    // Contar total de produtos na faixa de preço
    const totalProdutosFaixa = await collection.countDocuments(matchCondition);

    
    const stats = {
      totalProdutos: totalStats.length > 0 ? totalStats[0].totalProdutos : 0,
      uniqueEANs: totalStats.length > 0 ? totalStats[0].uniqueEANs.length : 0,
      eansComMultiplasLojas: multipleStoresCount.length > 0 ? multipleStoresCount[0].total : 0,
      exemplos: result,
      produtosMaisCaros: produtosMaisCaros,
      totalProdutosFaixa: totalProdutosFaixa,
      filtroAplicado: {
        minPrice,
        maxPrice: maxPrice || 'sem limite'
      }
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao obter estatísticas' },
      { status: 500 }
    );
  }
}
