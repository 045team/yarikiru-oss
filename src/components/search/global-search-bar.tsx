/**
 * Global Search Bar Component
 *
 * Provides semantic search across goals, tasks, work logs, and learning items.
 * Shows real-time results as user types.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X, FileText, CheckCircle, Clock, BookOpen, GitBranch } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { debounce } from 'lodash-es'

interface SearchResult {
  id: string
  type: 'goal' | 'sub_task' | 'work_log' | 'learning_item'
  title: string
  content: string
  similarity: number
  context?: {
    projectId?: string
    projectName?: string
    goalId?: string
    goalTitle?: string
  }
  metadata?: {
    status?: string
    createdAt?: string
    completedAt?: string
    tags?: string[]
  }
}

interface SearchResponse {
  results: SearchResult[]
  query_dimension: number
  total_found: number
}

const TYPE_ICONS = {
  goal: CheckCircle,
  sub_task: Clock,
  work_log: FileText,
  learning_item: BookOpen,
}

const TYPE_COLORS = {
  goal: 'text-blue-500',
  sub_task: 'text-purple-500',
  work_log: 'text-green-500',
  learning_item: 'text-orange-500',
}

const STATUS_COLORS = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

interface GlobalSearchBarProps {
  placeholder?: string
  onResultClick?: (result: SearchResult) => void
  className?: string
}

export function GlobalSearchBar({
  placeholder = 'Search goals, tasks, learnings...',
  onResultClick,
  className = '',
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 8,
            threshold: 0.3,
          }),
        })

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data: SearchResponse = await response.json()
        setResults(data.results)
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }

  // Handle clear
  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result)
    setIsOpen(false)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultClick(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Searching...</span>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
          >
            {results.map((result, index) => {
              const Icon = TYPE_ICONS[result.type]
              const isSelected = index === selectedIndex

              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${TYPE_COLORS[result.type]}`} />

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {result.title}
                      </span>
                      {result.metadata?.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[result.metadata.status as keyof typeof STATUS_COLORS]}`}>
                          {result.metadata.status}
                        </span>
                      )}
                    </div>

                    {result.content && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                        {result.content}
                      </p>
                    )}

                    {result.context && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {result.context.projectName && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {result.context.projectName}
                          </span>
                        )}
                        {result.context.goalTitle && (
                          <span>→ {result.context.goalTitle}</span>
                        )}
                      </div>
                    )}

                    {result.metadata?.tags && result.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.metadata.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-blue-600">
                      {Math.round(result.similarity * 100)}%
                    </span>
                    {result.metadata?.createdAt && (
                      <span className="text-xs text-gray-400">
                        {formatDate(result.metadata.createdAt)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}

            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              {results.length} results found
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      {isOpen && !isLoading && query && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
        >
          <p className="text-sm text-gray-600 text-center">
            No results found for &quot;{query}&quot;
          </p>
        </motion.div>
      )}
    </div>
  )
}
