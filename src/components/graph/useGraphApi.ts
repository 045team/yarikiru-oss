'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskGraph, TaskGraphNode, TaskGraphEdge } from '@/lib/turso/graphs'

interface GraphData {
  graph: TaskGraph | null
  nodes: TaskGraphNode[]
  edges: TaskGraphEdge[]
}

interface UseGraphApiResult {
  data: GraphData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  saveGraph: (changes: {
    nodes: Partial<TaskGraphNode>[]
    edges: Partial<TaskGraphEdge>[]
  }) => Promise<void>
  isSaving: boolean
}

export function useGraphApi(goalId: string): UseGraphApiResult {
  const [data, setData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchGraph = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/graph`)
      if (!response.ok) {
        throw new Error(`Failed to fetch graph: ${response.statusText}`)
      }

      const result = await response.json()
      setData({
        graph: result.graph,
        nodes: result.nodes || [],
        edges: result.edges || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching graph:', err)
    } finally {
      setIsLoading(false)
    }
  }, [goalId])

  const saveGraph = useCallback(
    async (changes: {
      nodes: Partial<TaskGraphNode>[]
      edges: Partial<TaskGraphEdge>[]
    }) => {
      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch(`/api/goals/${goalId}/graph`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nodes: changes.nodes,
            edges: changes.edges,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to save graph: ${response.statusText}`)
        }

        const result = await response.json()
        setData({
          graph: result.graph,
          nodes: result.nodes || [],
          edges: result.edges || [],
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        console.error('Error saving graph:', err)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [goalId]
  )

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  return {
    data,
    isLoading,
    error,
    refetch: fetchGraph,
    saveGraph,
    isSaving,
  }
}
