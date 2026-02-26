'use client';

/**
 * SimilarProjectsWarning
 *
 * Displays a warning when similar projects are detected during project creation.
 * Helps prevent duplicate projects and encourages reusing existing work.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SimilarProject {
  id: string;
  title: string;
  similarity: number;
}

interface SimilarProjectsWarningProps {
  query: string;
  userId?: string;
  threshold?: number; // Minimum similarity to show (default: 0.5)
  onProjectSelected?: (projectId: string) => void;
}

export function SimilarProjectsWarning({
  query,
  userId,
  threshold = 0.5,
  onProjectSelected,
}: SimilarProjectsWarningProps) {
  const [similarProjects, setSimilarProjects] = useState<SimilarProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSimilarProjects([]);
      return;
    }

    const fetchSimilarProjects = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/projects/similar', {
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
          throw new Error('Failed to fetch similar projects');
        }

        const data = await response.json();
        const filtered = data.results.filter(
          (p: SimilarProject) => p.similarity >= threshold
        );
        setSimilarProjects(filtered);
      } catch (err) {
        console.error('Error fetching similar projects:', err);
        setError('類似プロジェクトの検索に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(fetchSimilarProjects, 500);
    return () => clearTimeout(timeoutId);
  }, [query, userId, threshold]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>類似プロジェクトを検索中...</span>
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

  if (similarProjects.length === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-purple-600 dark:text-purple-500 text-lg">🚀</span>
        <div className="flex-1">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
            類似のプロジェクトが見つかりました
          </h4>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            以下のプロジェクトが既に存在します。重複を避けるため、既存のプロジェクトを確認することをおすすめします。
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {similarProjects.map((project) => (
          <li
            key={project.id}
            className="bg-white dark:bg-gray-900 rounded border border-purple-200 dark:border-purple-900 p-3 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                    {Math.round(project.similarity * 100)}% 一致
                  </span>
                </div>
                <h5 className="font-medium text-sm mt-1.5 text-gray-900 dark:text-gray-100 truncate">
                  {project.title}
                </h5>
              </div>
              <Link
                href={`/projects/${project.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 whitespace-nowrap"
                onClick={() => onProjectSelected?.(project.id)}
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
