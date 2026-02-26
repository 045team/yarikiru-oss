'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  total: number
  limit: number
  offset: number
  onPageChange: (newOffset: number) => void
}

export function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  if (totalPages <= 1) return null

  const canGoPrev = offset > 0
  const canGoNext = offset + limit < total

  const handlePrev = () => {
    if (canGoPrev) {
      onPageChange(Math.max(0, offset - limit))
    }
  }

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(offset + limit)
    }
  }

  const goToPage = (page: number) => {
    onPageChange((page - 1) * limit)
  }

  // Show page numbers: current, prev, next, first, last
  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push(-1) // Ellipsis
      }

      // Show pages around current
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push(-1) // Ellipsis
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-gray-500">
        全 {total} 件中 {offset + 1} - {Math.min(offset + limit, total)} 件を表示
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoPrev}
          onClick={handlePrev}
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </Button>

        {pageNumbers.map((page, index) => {
          if (page === -1) {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            )
          }

          return (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="icon"
              className={`h-8 w-8 ${
                page === currentPage
                  ? 'bg-[#d97756] text-white border-[#d97756]'
                  : 'border-gray-200'
              }`}
              onClick={() => goToPage(page)}
            >
              {page}
            </Button>
          )
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoNext}
          onClick={handleNext}
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  )
}
