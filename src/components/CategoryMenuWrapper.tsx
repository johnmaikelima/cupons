'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { IoChevronDownOutline, IoChevronForwardOutline } from 'react-icons/io5';
import { Category } from '@/types/category';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { getCategoryIcon } from '@/utils/category-icons';

export default function CategoryMenuWrapper() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const router = useRouter();

  const categoryRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const subcategoryRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      let container = document.getElementById('dropdown-portal-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'dropdown-portal-container';
        document.body.appendChild(container);
      }
      setPortalContainer(container);
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (data.categories) setCategories(data.categories);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.category-item') && !target.closest('.category-dropdown')) {
        setActiveCategory(null);
        setActiveSubcategory(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCategory(null);
        setActiveSubcategory(null);
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 w-24 bg-blue-500/50 animate-pulse rounded-lg" />)}
      </div>
    );
  }

  if (categories.length === 0) {
    return <div className="text-blue-100 text-sm">Nenhuma categoria.</div>;
  }

  // Mobile version
  if (isMobile) {
    return (
      <div className="flex gap-4">
        {categories.map((category) => (
          <div key={category._id} className="relative category-item">
            <button
              ref={el => { categoryRefs.current[category._id] = el; }}
              onClick={() => setActiveCategory(activeCategory === category._id ? null : category._id)}
              className={`flex flex-col items-center justify-center text-center gap-1 p-1 rounded-lg w-25 h-25 ${activeCategory === category._id ? 'bg-blue-700' : ''}`}>
              <span className="text-2xl text-white">{getCategoryIcon(category.icon)}</span>
              <span className="text-xs text-white truncate w-full">{category.name}</span>
            </button>

            {activeCategory === category._id && portalContainer && createPortal(
              <>
                <div className="fixed inset-0 bg-black/30 z-[9999]" onClick={() => setActiveCategory(null)} />
                <div
                  className="absolute bg-white rounded-lg shadow-lg p-2 z-[10000] w-64 max-h-[70vh] overflow-y-auto category-dropdown"
                  style={{
                    top: `${categoryRefs.current[category._id]?.getBoundingClientRect().bottom + 8}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {category.children?.map(subcat => (
                    <div key={subcat._id} className="relative">
                      <button
                        onClick={() => window.location.href = `/categoria/${subcat.slug}`}
                        className="w-full text-left block px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded-md"
                      >
                        {subcat.name}
                      </button>
                    </div>
                  ))}
                </div>
              </>,
              portalContainer
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="flex gap-1">
      {categories.map((category) => (
        <div key={category._id} className="relative group">
          <Link
            href={`/categoria/${category.slug}`}
            className="px-3 h-12 flex items-center gap-2 text-blue-100 hover:text-white transition-colors text-sm font-medium whitespace-nowrap"
          >
            {getCategoryIcon(category.icon)}
            <span>{category.name}</span>
            {category.children && category.children.length > 0 && <IoChevronDownOutline className="w-4 h-4 ml-1 group-hover:rotate-180 transition-transform" />}
          </Link>

          {category.children && category.children.length > 0 && (
            <div className="absolute top-full left-0 w-56 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[10000]">
              {category.children.map((subcat) => (
                <div key={subcat._id} className="relative group/sub">
                  <Link
                    href={`/categoria/${subcat.slug}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between"
                  >
                    <span className="truncate">{subcat.name}</span>
                    {subcat.children && subcat.children.length > 0 && <IoChevronForwardOutline className="w-4 h-4" />}
                  </Link>

                  {subcat.children && subcat.children.length > 0 && (
                    <div className="absolute top-0 left-full w-56 bg-white rounded-lg shadow-lg py-2 ml-1 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-200 z-[10001] max-h-[80vh] overflow-y-auto">
                      {subcat.children.map((subsubcat) => (
                        <Link
                          key={subsubcat._id}
                          href={`/categoria/${subsubcat.slug}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 truncate"
                        >
                          {subsubcat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
