'use client';

/**
 * SimilarGoalsWarning
 *
 * Displays a warning when similar goals are detected during goal creation.
 * Helps prevent duplicate goals and encourages reusing existing work.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SimilarGoal {
  id: string;
  title: string;
  description: string;
  status: string;
  similarity: number;
  project: {
    id: string;
    title: string;
  };
}

interface SimilarGoalsWarningProps {
  query: string;
  userId?: string;
  threshold?: number; // Minimum similarity to show (default: 0.5)
  onGoalSelected?: (goalId: string) => void;
}

export function SimilarGoalsWarning({
  query,
  userId,
  threshold = 0.5,
  onGoalSelected,
}: SimilarGoalsWarningProps) {
  const [similarGoals, setSimilarGoals] = useState<SimilarGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSimilarGoals([]);
      return;
    }

    const fetchSimilarGoals = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/goals/similar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 3,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch similar goals');
        }

        const data = await response.json();
        const filtered = data.results.filter(
          (g: SimilarGoal) => g.similarity >= threshold
        );
        setSimilarGoals(filtered);
      } catch (err) {
        console.error('Error fetching similar goals:', err);
        setError('類似タスクの検索に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(fetchSimilarGoals, 500);
    return () => clearTimeout(timeoutId);
  }, [query, userId, threshold]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>類似タスクを検索中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
        {error}
      </div>
    );
  }

  if (similarGoals.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 dark:text-amber-500 text-lg">⚠️</span>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
            類似のタスクが見つかりました
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            以下のタスクが既に存在します。重複を避けるため、既存のタスクを利用することを検討してください。
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {similarGoals.map((goal) => (
          <li
            key={goal.id}
            className="bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-900 p-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                    {Math.round(goal.similarity * 100)}% 一致
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      goal.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : goal.status === 'archived'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}
                  >
                    {goal.status === 'completed'
                      ? '完了'
                      : goal.status === 'archived'
                        ? 'アーカイブ'
                        : '進行中'}
                  </span>
                </div>
                <h5 className="font-medium text-sm mt-1.5 text-gray-900 dark:text-gray-100 truncate">
                  {goal.title}
                </h5>
                {goal.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {goal.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  プロジェクト: {goal.project.title}
                </p>
              </div>
              <Link
                href={`/projects/${goal.project.id}/goals/${goal.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 whitespace-nowrap"
                onClick={() => onGoalSelected?.(goal.id)}
              >
                詳細を見る →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
