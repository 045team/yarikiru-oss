// ============================================
// Task Decomposition Example Component
// Demonstrates usage of the useTaskDecomposition hook
// ============================================

'use client'

import React, { useState } from 'react'
import { useTaskDecomposition } from '@/hooks/useTaskDecomposition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, Circle, Clock } from 'lucide-react'

interface TaskDecompositionExampleProps {
  userId: string
}

export function TaskDecompositionExample({ userId }: TaskDecompositionExampleProps) {
  const [goal, setGoal] = useState('')
  const [deadline, setDeadline] = useState('')
  const [availableHours, setAvailableHours] = useState(2)
  const [context, setContext] = useState('')

  const {
    isLoading,
    error,
    decomposition,
    goalId,
    decompose,
    refine,
    save,
    reset,
    completionPercentage,
    nextTask,
    highPriorityTasks,
    mediumPriorityTasks,
    lowPriorityTasks,
  } = useTaskDecomposition()

  const handleDecompose = async () => {
    if (!goal || !deadline) {
      alert('Please fill in the goal and deadline')
      return
    }

    await decompose({
      userId,
      title: goal,
      description: goal,
      deadline: new Date(deadline),
      availableHoursPerDay: availableHours,
      context: context || undefined,
    })
  }

  const handleSave = async () => {
    try {
      await save()
      alert('Goal and tasks saved successfully!')
      reset()
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleRefine = async () => {
    const feedback = prompt('Provide feedback for refining the decomposition:')
    if (feedback) {
      await refine(feedback)
    }
  }

  const renderTask = (task: any, index: number) => (
    <Card key={index} className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              task.priority === 'high' ? 'bg-red-100 text-red-700' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {task.priority}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {task.estimatedMinutes}m
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {task.subTasks?.map((subtask: any, subIndex: number) => (
            <div key={subIndex} className="flex items-center gap-2 text-sm">
              {subtask.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className={subtask.completed ? 'line-through text-gray-400' : ''}>
                {subtask.title}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {subtask.estimatedMinutes}m
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg">Decomposing your goal...</span>
      </div>
    )
  }

  if (decomposition) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Goal Decomposition Complete!</CardTitle>
            <CardDescription>
              Total estimated time: {decomposition.totalEstimatedMinutes} minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Tasks per day</p>
                <p className="text-2xl font-bold">
                  {decomposition.recommendedSchedule.tasksPerDay}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hours per day</p>
                <p className="text-2xl font-bold">
                  {decomposition.recommendedSchedule.hoursPerDay}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Save Goal & Tasks
              </Button>
              <Button onClick={handleRefine} variant="outline">
                Refine
              </Button>
              <Button onClick={reset} variant="ghost">
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {nextTask && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">Next Task to Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{nextTask.title}</p>
            </CardContent>
          </Card>
        )}

        {highPriorityTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">High Priority Tasks</h3>
            {highPriorityTasks.map((task, i) => renderTask(task, i))}
          </div>
        )}

        {mediumPriorityTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Medium Priority Tasks</h3>
            {mediumPriorityTasks.map((task, i) => renderTask(task, i))}
          </div>
        )}

        {lowPriorityTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Low Priority Tasks</h3>
            {lowPriorityTasks.map((task, i) => renderTask(task, i))}
          </div>
        )}

        {decomposition.assumptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {decomposition.assumptions.map((assumption, i) => (
                  <li key={i} className="text-sm text-gray-700">{assumption}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Decompose Your Goal</CardTitle>
          <CardDescription>
            Enter your goal and let AI break it down into 15-minute tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Goal</label>
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Launch a new product feature by next month"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Deadline</label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Available Hours Per Day: {availableHours}
            </label>
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={availableHours}
              onChange={(e) => setAvailableHours(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Additional Context (Optional)</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any additional information that might help with task breakdown..."
              rows={2}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button onClick={handleDecompose} className="w-full" size="lg">
            Decompose Goal
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
