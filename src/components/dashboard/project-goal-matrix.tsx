'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Target, GitBranch } from 'lucide-react'
import { Project, Goal } from '@/types/dashboard'
import { useGlossary } from '@/contexts/display-context'

interface ProjectGoalMatrixProps {
  projects: Project[]
  currentProjectIndex: number
  onProjectChange: (index: number) => void
  children: (project: Project) => React.ReactNode
}

export function ProjectGoalMatrix({
  projects,
  currentProjectIndex,
  onProjectChange,
  children,
}: ProjectGoalMatrixProps) {
  const { getDisplayTerm } = useGlossary()
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set([currentProjectIndex])
  )

  const toggleProject = (index: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <div className="w-full">
      {/* プロジェクトセレクター（2軸ビュー） */}
      <div className="mb-6 space-y-2">
        {projects.map((project, index) => {
          const isExpanded = expandedProjects.has(index)
          const isActive = index === currentProjectIndex
          const goalTerm = getDisplayTerm('目標', 'Goal')

          return (
            <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* プロジェクトヘッダー */}
              <button
                type="button"
                onClick={() => toggleProject(index)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-800">{project.title || 'Untitled'}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {project.goals?.length || 0} {goalTerm}
                  </span>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onProjectChange(index)
                      }}
                      className="px-3 py-1 text-xs bg-[#d97756] text-white rounded hover:bg-[#c96b45] transition-colors"
                    >
                      選択
                    </button>
                  )}
                </div>
              </button>

              {/* プロジェクト詳細（展開時） */}
              {isExpanded && (
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50/50">
                  {/* 目標リスト */}
                  {project.goals && project.goals.length > 0 ? (
                    <div className="space-y-1">
                      {project.goals.map((goal) => (
                        <GoalRow key={goal.id} goal={goal} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-400">
                      {goalTerm}がありません
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* アクティブプロジェクトの詳細表示 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-[#d97756]" />
            <h2 className="text-lg font-semibold text-gray-800">
              {projects[currentProjectIndex]?.title || 'Untitled'}
            </h2>
          </div>
          <span className="text-sm text-gray-500">
            現在のプロジェクト
          </span>
        </div>
        {children(projects[currentProjectIndex])}
      </div>
    </div>
  )
}

// --- 目標行コンポーネント ---
function GoalRow({ goal }: { goal: Goal }) {
  const { getDisplayTerm } = useGlossary()
  const goalTerm = getDisplayTerm('目標', 'Goal')

  const completedSubTasks = goal.subTasks?.filter(s => s.isDone).length || 0
  const totalSubTasks = goal.subTasks?.length || 0
  const progress = totalSubTasks > 0 ? completedSubTasks / totalSubTasks : 0

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white rounded border border-gray-200">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {/* プログレスバー */}
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-[#d97756] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* 目標タイトル */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">{goal.title}</p>
          {totalSubTasks > 0 && (
            <p className="text-xs text-gray-400">
              {completedSubTasks}/{totalSubTasks} 完了
            </p>
          )}
        </div>
      </div>

      {/* ステータス */}
      <div className="flex items-center space-x-2 shrink-0">
        {goal.status === 'done' && (
          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">
            完了
          </span>
        )}
        {goal.isUrgent && (
          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded">
            緊急
          </span>
        )}
      </div>
    </div>
  )
}
