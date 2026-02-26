/**
 * Autonomous Task Decomposer
 * 高レベルな機能要求を原子タスクに自動分解するエージェント
 */

export interface AtomicTask {
  id: string;
  title: string;
  description: string;
  files: string[];
  dependencies: string[];
  estimatedMinutes: number;
  validationCriteria: string[];
  parallelGroup: number;
}

export interface TaskGraph {
  feature: string;
  tasks: AtomicTask[];
  executionPlan: {
    group: number;
    tasks: string[];
    canRunInParallel: boolean;
  }[];
}

/**
 * タスク分解プロンプトを生成
 */
export function generateDecompositionPrompt(
  feature: string,
  projectContext: string
): string {
  return `
あなたはタスク分解の専門家です。以下の機能要求を原子タスク（30分〜2時間で完了可能）に分解してください。

## 機能要求
${feature}

## プロジェクトコンテキスト
${projectContext}

## 分解ルール
1. 各タスクは独立して完了可能であること
2. タスクサイズは30分〜2時間
3. 明確な成果物があること
4. テスト、ドキュメント、マイグレーションは別タスク
5. 並列実行可能なタスクを識別すること

## 出力形式（JSON）
{
  "feature": "${feature}",
  "tasks": [
    {
      "id": "t1",
      "title": "Create database schema for embeddings",
      "description": "Add embedding vector column to goals table",
      "files": ["turso/migrations/018_add_embeddings.sql"],
      "dependencies": [],
      "estimatedMinutes": 30,
      "validationCriteria": [
        "Migration file exists",
        "SQL syntax is valid",
        "Column type is correct (VECTOR or BLOB)"
      ],
      "parallelGroup": 1
    }
  ],
  "executionPlan": [
    {
      "group": 1,
      "tasks": ["t1", "t2", "t3"],
      "canRunInParallel": true
    },
    {
      "group": 2,
      "tasks": ["t4", "t5"],
      "canRunInParallel": true,
      "dependencies": ["group1"]
    }
  ]
}
`;
}

/**
 * タスクグラフを検証
 */
export function validateTaskGraph(graph: TaskGraph): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 基本構造の検証
  if (!graph.tasks || graph.tasks.length === 0) {
    errors.push("タスクが空です");
  }

  // タスクIDのユニーク性
  const ids = new Set<string>();
  for (const task of graph.tasks) {
    if (ids.has(task.id)) {
      errors.push(`重複するタスクID: ${task.id}`);
    }
    ids.add(task.id);
  }

  // 依存関係の整合性
  for (const task of graph.tasks) {
    for (const dep of task.dependencies) {
      if (!ids.has(dep)) {
        errors.push(`タスク${task.id}の依存先${dep}が存在しません`);
      }
    }
  }

  // 循環依存の検出
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(taskId: string): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);

    const task = graph.tasks.find((t) => t.id === taskId);
    if (task) {
      for (const dep of task.dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of graph.tasks) {
    if (!visited.has(task.id)) {
      if (hasCycle(task.id)) {
        errors.push("タスクグラフに循環依存が存在します");
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 実行プランを生成
 */
export function generateExecutionPlan(graph: TaskGraph): TaskGraph {
  const taskMap = new Map(graph.tasks.map((t) => [t.id, t]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // グラフの初期化
  for (const task of graph.tasks) {
    inDegree.set(task.id, 0);
    adjList.set(task.id, []);
  }

  // 依存関係の構築
  for (const task of graph.tasks) {
    for (const dep of task.dependencies) {
      adjList.get(dep)?.push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }

  // トポロジカルソートでグループ化
  const groups: string[][] = [];
  const queue: string[] = [];

  // 最初のグループ（依存関係なし）
  for (const [taskId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  let groupNum = 1;
  while (queue.length > 0) {
    const groupSize = queue.length;
    const currentGroup: string[] = [];

    for (let i = 0; i < groupSize; i++) {
      const taskId = queue.shift()!;
      currentGroup.push(taskId);

      // タスクのparallelGroupを設定
      const task = taskMap.get(taskId);
      if (task) {
        task.parallelGroup = groupNum;
      }

      // 依存するタスクのinDegreeを減らす
      const neighbors = adjList.get(taskId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    groups.push(currentGroup);
    groupNum++;
  }

  // 実行プランを構築
  graph.executionPlan = groups.map((group, idx) => ({
    group: idx + 1,
    tasks: group,
    canRunInParallel: group.length > 1,
  }));

  return graph;
}

/**
 * タスク分解を実行（LLMを使用）
 */
export async function decomposeFeature(
  feature: string,
  projectContext: string
): Promise<TaskGraph> {
  // 実際の実装では、ここでLLM APIを呼び出す
  // 今はデモ用のモック実装
  const mockGraph: TaskGraph = {
    feature,
    tasks: [
      {
        id: "t1",
        title: "Install dependencies",
        description: "Install CocoIndex SDK and required packages",
        files: ["package.json"],
        dependencies: [],
        estimatedMinutes: 15,
        validationCriteria: ["Packages installed", "No conflicts"],
        parallelGroup: 1,
      },
      {
        id: "t2",
        title: "Create database migration",
        description: "Add embedding columns to database schema",
        files: ["turso/migrations/018_add_embeddings.sql"],
        dependencies: [],
        estimatedMinutes: 30,
        validationCriteria: ["Migration file exists", "SQL is valid"],
        parallelGroup: 1,
      },
      {
        id: "t3",
        title: "Implement embedding generation",
        description: "Create service to generate embeddings for goals",
        files: ["src/lib/embeddings.ts"],
        dependencies: ["t1"],
        estimatedMinutes: 60,
        validationCriteria: ["Unit tests pass", "Embeddings generated"],
        parallelGroup: 2,
      },
    ],
    executionPlan: [],
  };

  return generateExecutionPlan(mockGraph);
}

/**
 * 進捗レポートを生成
 */
export function generateProgressReport(graph: TaskGraph): string {
  let report = `# タスク実行プラン: ${graph.feature}\n\n`;

  report += `## 概要\n`;
  report += `- 総タスク数: ${graph.tasks.length}\n`;
  report += `- 総見積時間: ${graph.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)}分\n`;
  report += `- 実行フェーズ: ${graph.executionPlan.length}段階\n\n`;

  report += `## 実行プラン\n\n`;
  for (const plan of graph.executionPlan) {
    report += `### Phase ${plan.group}\n`;
    report += plan.canRunInParallel ? "🔄 並列実行可能\n" : "⏳ 順次実行\n";
    report += "```\n";
    for (const taskId of plan.tasks) {
      const task = graph.tasks.find((t) => t.id === taskId);
      if (task) {
        report += `- ${task.id}: ${task.title} (${task.estimatedMinutes}分)\n`;
      }
    }
    report += "```\n\n";
  }

  return report;
}
