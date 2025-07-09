'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EanStats {
  totalProdutos: number;
  uniqueEANs: number;
  eansComMultiplasLojas: number;
  exemplos: Array<{
    _id: string;
    count: number;
    lojas: string[];
    produtos: Array<{
      merchant_name: string;
      store_price: number;
      in_stock: number;
    }>;
  }>;
  produtosMaisCaros: Array<{
    _id: string;
    ean: string;
    product_name: string;
    merchant_name: string;
    store_price: number;
    merchant_product_id: string;
    in_stock: number;
    aw_deep_link: string;
  }>;
  totalProdutosFaixa: number;
  filtroAplicado: {
    minPrice: number;
    maxPrice: number | string;
  };
}

export default function EanStatsPage() {
  const [stats, setStats] = useState<EanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);
  const [faixasPreco, setFaixasPreco] = useState<{min: number, max?: number, label: string}[]>([
    { min: 0, label: 'Todos os produtos' },
    { min: 1000, label: 'Acima de R$ 1.000' },
    { min: 3000, label: 'Acima de R$ 3.000' },
    { min: 5000, label: 'Acima de R$ 5.000' },
    { min: 10000, label: 'Acima de R$ 10.000' },
    { min: 20000, label: 'Acima de R$ 20.000' },
    { min: 1000, max: 3000, label: 'R$ 1.000 a R$ 3.000' },
    { min: 3000, max: 5000, label: 'R$ 3.000 a R$ 5.000' },
    { min: 5000, max: 10000, label: 'R$ 5.000 a R$ 10.000' },
    { min: 10000, max: 20000, label: 'R$ 10.000 a R$ 20.000' },
  ]);

  const fetchStats = async (params: { min?: number; max?: number; showAll?: boolean } = {}) => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams();
      
      if (params.min !== undefined && params.min > 0) {
        urlParams.append('minPrice', params.min.toString());
      }
      
      if (params.max !== undefined && params.max > 0) {
        urlParams.append('maxPrice', params.max.toString());
      }
      
      if (params.showAll) {
        urlParams.append('showAll', 'true');
      }
      
      const url = `/api/admin/ean-stats${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar estatísticas: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchStats();
  }, []);
  
  // Função para filtrar por faixa de preço predefinida
  const handleFiltrarPorFaixa = (min: number, max?: number) => {
    setMinPrice(min.toString());
    setMaxPrice(max ? max.toString() : '');
    fetchStats({ min, max, showAll });
  };
  
  // Função para filtrar por faixa de preço personalizada
  const handleFiltroPersonalizado = (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseFloat(minPrice);
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    
    if (!isNaN(min)) {
      fetchStats({ min, max, showAll });
    }
  };
  
  // Função para alternar a exibição de todos os produtos
  const handleToggleShowAll = () => {
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    
    // Refaz a busca com o novo parâmetro
    const min = parseFloat(minPrice);
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    fetchStats({ 
      min: !isNaN(min) ? min : undefined, 
      max: !isNaN(max) ? max : undefined, 
      showAll: newShowAll 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
        <strong className="font-bold">Erro!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-blue-500 hover:text-blue-700">
          &larr; Voltar para Admin
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Estatísticas de EANs por Lojas</h1>
      
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700">Total de Produtos</h2>
              <p className="text-3xl font-bold text-blue-600">{stats.totalProdutos.toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700">EANs Únicos</h2>
              <p className="text-3xl font-bold text-green-600">{stats.uniqueEANs.toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700">EANs com Múltiplas Lojas</h2>
              <p className="text-3xl font-bold text-purple-600">{stats.eansComMultiplasLojas.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-2">
                ({((stats.eansComMultiplasLojas / stats.uniqueEANs) * 100).toFixed(2)}% dos EANs únicos)
              </p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Produtos por Faixa de Preço</h2>
          
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {faixasPreco.map((faixa, index) => (
                <button
                  key={index}
                  onClick={() => handleFiltrarPorFaixa(faixa.min, faixa.max)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    minPrice === faixa.min.toString() && 
                    (faixa.max ? maxPrice === faixa.max.toString() : !maxPrice)
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  {faixa.label}
                </button>
              ))}
            </div>
            
            <form onSubmit={handleFiltroPersonalizado} className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Valor mínimo"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <span className="mx-2">até</span>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Valor máximo"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Filtrar
              </button>
            </form>
            
            <div className="flex items-center mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={handleToggleShowAll}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-gray-700">Mostrar todos os produtos (pode ser lento)</span>
              </label>
            </div>
            
            {stats && (
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <p className="text-blue-800">
                  Exibindo {stats.produtosMaisCaros.length} de {stats.totalProdutosFaixa} produtos 
                  {stats.filtroAplicado.minPrice > 0 && ` com preço a partir de R$ ${stats.filtroAplicado.minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  {stats.filtroAplicado.maxPrice !== 'sem limite' && ` até R$ ${Number(stats.filtroAplicado.maxPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Produto</th>
                  <th className="px-4 py-2 border">Loja</th>
                  <th className="px-4 py-2 border">Preço</th>
                  <th className="px-4 py-2 border">Estoque</th>
                  <th className="px-4 py-2 border">EAN</th>
                  <th className="px-4 py-2 border">Link</th>
                </tr>
              </thead>
              <tbody>
                {stats.produtosMaisCaros.map((produto) => (
                  <tr key={produto._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{produto.product_name || 'Sem nome'}</td>
                    <td className="px-4 py-2 border">{produto.merchant_name}</td>
                    <td className="px-4 py-2 border font-bold text-right">
                      R$ {produto.store_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 border text-center">{produto.in_stock}</td>
                    <td className="px-4 py-2 border text-sm">{produto.ean}</td>
                    <td className="px-4 py-2 border text-center">
                      {produto.aw_deep_link && (
                        <a 
                          href={produto.aw_deep_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Top 100 EANs com Múltiplas Lojas</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">EAN</th>
                  <th className="px-4 py-2 border">Qtd. Lojas</th>
                  <th className="px-4 py-2 border">Lojas</th>
                  <th className="px-4 py-2 border">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {stats.exemplos.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{item._id}</td>
                    <td className="px-4 py-2 border text-center">{item.count}</td>
                    <td className="px-4 py-2 border">
                      <div className="flex flex-wrap gap-1">
                        {item.lojas.map((loja, index) => (
                          <span 
                            key={index} 
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {loja}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 border">
                      <details className="cursor-pointer">
                        <summary className="text-blue-500 hover:text-blue-700">Ver preços</summary>
                        <div className="mt-2 bg-gray-50 p-2 rounded">
                          <table className="min-w-full">
                            <thead>
                              <tr>
                                <th className="px-2 py-1 text-left text-xs">Loja</th>
                                <th className="px-2 py-1 text-right text-xs">Preço</th>
                                <th className="px-2 py-1 text-right text-xs">Estoque</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.produtos.map((produto, idx) => (
                                <tr key={idx} className="border-t border-gray-200">
                                  <td className="px-2 py-1 text-xs">{produto.merchant_name}</td>
                                  <td className="px-2 py-1 text-right text-xs">
                                    R$ {produto.store_price.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1 text-right text-xs">
                                    {produto.in_stock}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
