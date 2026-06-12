'use client'

import { cn } from '@/lib/utils'
import { LayoutGrid, Tag } from 'lucide-react'

interface FilterPillsProps {
  categories: string[]
  selected: string | null
  onSelect: (category: string | null) => void
}

export function FilterPills({ categories, selected, onSelect }: FilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:gap-3 lg:justify-start">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'group flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 md:px-6 md:py-3',
          selected === null
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'bg-card text-foreground ring-1 ring-border hover:bg-pastel-rose/30 hover:ring-primary/20'
        )}
      >
        <LayoutGrid className={cn(
          'size-4 transition-transform duration-300',
          selected === null ? '' : 'group-hover:scale-110'
        )} />
        <span>Todos</span>
      </button>

      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={cn(
            'group flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 md:px-6 md:py-3',
            selected === category
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'bg-card text-foreground ring-1 ring-border hover:bg-pastel-lavender/30 hover:ring-primary/20'
          )}
        >
          <Tag className={cn(
            'size-4 transition-transform duration-300',
            selected === category ? '' : 'group-hover:scale-110'
          )} />
          <span>{category}</span>
        </button>
      ))}
    </div>
  )
}
