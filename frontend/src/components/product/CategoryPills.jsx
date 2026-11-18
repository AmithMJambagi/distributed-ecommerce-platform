import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productApi } from '../../api/productApi';

export default function CategoryPills({ selectedCategory, onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      try {
        const data = await productApi.getCategories();
        if (mounted) {
          setCategories(data || []);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full bg-white border-b border-neutral-200 sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-2">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-7 h-7 shrink-0 flex items-center justify-center border border-neutral-300 bg-white hover:bg-black hover:text-white transition"
            aria-label="Scroll categories left"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Chips Track */}
          <div
            ref={scrollRef}
            className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {/* "ALL" Chip */}
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap shrink-0 border ${
                selectedCategory === 'all' || !selectedCategory
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-600 border-transparent hover:border-neutral-300 hover:text-black'
              }`}
            >
              All Products
            </button>

            {/* Dynamic Categories */}
            {categories.map((cat) => {
              const isSelected = String(selectedCategory) === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-neutral-600 border-transparent hover:border-neutral-300 hover:text-black'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-7 h-7 shrink-0 flex items-center justify-center border border-neutral-300 bg-white hover:bg-black hover:text-white transition"
            aria-label="Scroll categories right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
