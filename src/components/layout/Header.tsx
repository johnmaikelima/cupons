'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IoSearchOutline, IoNotificationsOutline, IoTicketOutline } from 'react-icons/io5';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { IoMdArrowDropdown } from 'react-icons/io';
import CategoryMenuWrapper from '../CategoryMenuWrapper';
import { useRouter } from 'next/navigation';

interface SiteConfig {
  logo: string;
  name: string;
}

interface StorePrice {
  price: number;
  url: string;
  lastUpdate: Date;
}

interface ComparisonProduct {
  _id: string;
  name: string;
  slug: string;
  ean: string;
  category: string;
  images: string[];
  currentPrice?: number;
  prices: {
    amazon?: StorePrice;
    kabum?: StorePrice;
    magalu?: StorePrice;
    terabyte?: StorePrice;
    pichau?: StorePrice;
  };
}

export default function Header() {
  const [config, setConfig] = useState<SiteConfig>({ logo: '', name: 'LinkCompra' });
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ComparisonProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setConfig(data);
        }
      })
      .catch(console.error);
      
    // Fechar dropdown e resultados de pesquisa ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? categoryScrollRef.current.scrollLeft - scrollAmount
        : categoryScrollRef.current.scrollLeft + scrollAmount;
      
      categoryScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };
  
  // Função para buscar produtos (preview no dropdown)
  const handleSearchPreview = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/search/products?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      
      if (data.products) {
        setSearchResults(data.products);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Função para lidar com a submissão do formulário de pesquisa
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    // Redirecionar para a página de resultados
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchResults([]);
  };
  
  // Efeito para buscar resultados ao digitar
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearchPreview();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  
  // Função para navegar para a página do produto
  const navigateToProduct = (slug: string) => {
    router.push(`/produtos/${slug}`);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <>
      <header className="bg-blue-600 sticky top-0 z-[100] shadow-sm">
        <div className="relative max-w-7xl mx-auto px-4 z-20">
          {/* Barra superior */}
          <div className="relative h-16 flex items-center justify-between z-[101]">
            {/* Logo (agora à esquerda) */}
            <div className="flex items-center">
              <Link href="/" className="relative w-32 h-8">
                {config.logo ? (
                  <Image
                    src={config.logo}
                    alt={config.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    className="brightness-0 invert"
                    priority
                  />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {config.name}
                  </span>
                )}
              </Link>
            </div>

            {/* Barra de pesquisa (agora no centro) - Visível apenas em desktop */}
            <div className="hidden lg:block flex-grow mx-8 max-w-xl relative" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none pr-10"
                />
                <button 
                  type="submit" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                  disabled={isSearching}
                  title="Ver todos os resultados"
                >
                  <IoSearchOutline className="w-5 h-5" />
                </button>
              </form>
              
              {/* Resultados da pesquisa */}
              {searchResults.length > 0 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 bg-white shadow-lg rounded-lg max-h-80 overflow-y-auto z-[110]"
                  ref={searchResultsRef}
                >
                  {searchResults.map((product) => {
                    // Obter a loja com menor preço
                    const availableStores = Object.entries(product.prices || {}).filter(([_, storeData]) => storeData);
                    const bestStore = availableStores.reduce((best, [storeName, storeData]) => {
                      if (!best || (storeData && storeData.price < best.price)) {
                        return { store: storeName, price: storeData.price };
                      }
                      return best;
                    }, null as { store: string; price: number } | null);
                    
                    // Mapear nomes de lojas para exibição
                    const storeDisplayNames: {[key: string]: string} = {
                      amazon: 'Amazon',
                      kabum: 'KaBuM',
                      magalu: 'Magazine Luiza',
                      terabyte: 'Terabyte',
                      pichau: 'Pichau'
                    };
                    
                    return (
                      <div 
                        key={product._id}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                        onClick={() => navigateToProduct(product.slug)}
                      >
                        <div>
                          <h4 className="font-medium text-gray-800 line-clamp-1">{product.name}</h4>
                          <div className="flex items-center gap-2 text-sm">
                            {bestStore && (
                              <span className="text-gray-600">{storeDisplayNames[bestStore.store] || bestStore.store}</span>
                            )}
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">EAN: {product.ean}</span>
                          </div>
                        </div>
                        <div className="text-blue-600 font-bold">
                          {product.currentPrice && product.currentPrice > 0
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.currentPrice)
                            : 'Indisponível'}
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-3 bg-gray-50 text-center">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        setSearchResults([]);
                      }}
                      className="text-blue-600 font-medium"
                    >
                      Ver todos os resultados
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Cupons com dropdown (agora à direita) */}
            <div className="relative" ref={dropdownRef}>
              {/* Versão mobile - apenas ícone */}
              <div className="lg:hidden">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-white hover:text-blue-100 flex items-center"
                >
                  <IoTicketOutline className="w-6 h-6" />
                </button>
              </div>
              
              {/* Versão desktop - texto com dropdown */}
              <div className="hidden lg:block">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-white hover:text-blue-100 font-medium flex items-center gap-1"
                >
                  <span>Cupons</span>
                  <IoMdArrowDropdown className="w-5 h-5" />
                </button>
              </div>
              
              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link 
                    href="/cupons" 
                    className="block px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => setShowDropdown(false)}
                  >
                    Cupons
                  </Link>
                  <Link 
                    href="/lojas" 
                    className="block px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => setShowDropdown(false)}
                  >
                    Lojas
                  </Link>
                </div>
              )}
            </div>
            
            {/* Botão de busca mobile */}
            <div className="lg:hidden ml-4">
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className="text-white hover:text-blue-100"
              >
                <IoSearchOutline className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Campo de busca expandido para mobile */}
          <div className={`absolute inset-x-0 top-16 bg-blue-700 p-4 z-[120] transition-all duration-300 lg:hidden ${showSearch ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none pr-10"
              />
              <button 
                type="submit" 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              >
                <IoSearchOutline className="w-5 h-5" />
              </button>
            </form>
            
            {/* Resultados da pesquisa mobile */}
            {searchResults.length > 0 && showSearch && (
              <div className="bg-white shadow-lg rounded-lg mt-2 max-h-80 overflow-y-auto">
                {searchResults.map((product) => {
                  // Obter a loja com menor preço
                  const availableStores = Object.entries(product.prices || {}).filter(([_, storeData]) => storeData);
                  const bestStore = availableStores.reduce((best, [storeName, storeData]) => {
                    if (!best || (storeData && storeData.price < best.price)) {
                      return { store: storeName, price: storeData.price };
                    }
                    return best;
                  }, null as { store: string; price: number } | null);
                  
                  // Mapear nomes de lojas para exibição
                  const storeDisplayNames: {[key: string]: string} = {
                    amazon: 'Amazon',
                    kabum: 'KaBuM',
                    magalu: 'Magazine Luiza',
                    terabyte: 'Terabyte',
                    pichau: 'Pichau'
                  };
                  
                  return (
                    <div 
                      key={product._id}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                      onClick={() => navigateToProduct(product.slug)}
                    >
                      <div>
                        <h4 className="font-medium text-gray-800 line-clamp-1">{product.name}</h4>
                        <div className="flex items-center gap-2 text-sm">
                          {bestStore && (
                            <span className="text-gray-600">{storeDisplayNames[bestStore.store] || bestStore.store}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-blue-600 font-bold">
                        {product.currentPrice && product.currentPrice > 0
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.currentPrice)
                          : 'Indisponível'}
                      </div>
                    </div>
                  );
                })}
                <div className="p-3 bg-gray-50 text-center">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      setShowSearch(false);
                    }}
                    className="text-blue-600 font-medium"
                  >
                    Ver todos os resultados
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menu de Categorias com scroll */}
          <div className="relative z-10 border-t border-blue-500">
            <button 
              onClick={() => scrollCategories('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-700 text-white p-1 rounded-r-lg z-10 lg:hidden"
            >
              <IoIosArrowBack className="w-5 h-5" />
            </button>

            {/* Wrapper para permitir scroll horizontal mas com dropdowns visíveis */}
            <div 
              ref={categoryScrollRef}
              className="py-2 overflow-x-auto lg:overflow-visible whitespace-nowrap scrollbar-hide"
            >
              <nav className="flex items-center gap-2 px-6 lg:px-0">
                <CategoryMenuWrapper />
              </nav>
            </div>

            <button 
              onClick={() => scrollCategories('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-700 text-white p-1 rounded-l-lg z-10 lg:hidden"
            >
              <IoIosArrowForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Botão flutuante de alertas */}
      <Link 
        href="/meus-alertas" 
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        <IoNotificationsOutline className="w-6 h-6" />
      </Link>
    </>
  );
}
