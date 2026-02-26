/**
 * Related Learnings Panel Component
 *
 * Automatically displays related learning items based on current context.
 * Can be shown in goal detail, project view, or dashboard.
 */

'use client'

import { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, RefreshCw, X, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

interface RelatedLearning {
  id: string
  title: string
  url: string
  summary: string | null
  similarity: number
  tags: string[]
  createdAt: string
}

interface RelatedLearningsPanelProps {
  goalId?: string
  projectId?: string
  limit?: number
  onDismiss?: () => void
  className?: string
}

export function RelatedLearningsPanel({
  goalId,
  projectId,
  limit = 3,
  onDismiss,
  className = '',
}: RelatedLearningsPanelProps) {
  const [learnings, setLearnings] = useState<RelatedLearning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRelatedLearnings()
  }, [goalId, projectId])

  const fetchRelatedLearnings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (goalId) params.set('goalId', goalId)
      if (projectId) params.set('projectId', projectId)
      params.set('limit', limit.toString())

      const response = await fetch(`/api/learnings/related?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch related learnings')
      }

      const data = await response.json()
      setLearnings(data.learnings || [])
    } catch (err) {
      console.error('Error fetching related learnings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load related learnings')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Related Learnings</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-700">Related Learnings</h3>
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  if (learnings.length === 0) {
    return null // Don't show empty state
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Related Learnings</h3>
          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
            {learnings.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRelatedLearnings}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onDismiss && (
            <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {learnings.map((learning) => (
          <a
            key={learning.id}
            href={learning.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg p-3 hover:bg-orange-50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-gray-900 group-hover:text-orange-700 transition-colors line-clamp-1">
                {learning.title}
              </h4>
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0" />
            </div>

            {learning.summary && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {learning.summary}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {learning.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {learning.similarity > 0.7 && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    Highly Relevant
                  </span>
                )}
              </div>

              <span className="text-xs text-gray-400">
                {Math.round(learning.similarity * 100)}% match
              </span>
            </div>
          </a>
        ))}
      </div>

      {learnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="text-xs text-gray-600">
            💡 These learnings are semantically related to your current context.
          </p>
        </div>
      )}
    </motion.div>
  )
}
