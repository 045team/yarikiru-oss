/**
 * Parallel Task Executor
 * タスクグラフに基づいて並列実行を行うエンジン
 */

import { AtomicTask, TaskGraph } from "./decomposer";

interface ExecutionResult {
  taskId: string;
  success: boolean;
  duration: number;
  output: string;
  errors?: string[];
}

interface PhaseResult {
  phase: number;
  tasks: ExecutionResult[];
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * タスク実行の進捗を管理
 */
export class ProgressTracker {
  private results: Map<string, ExecutionResult> = new Map();
  private currentPhase: number = 0;
  private startTime: number = 0;

  start(graph: TaskGraph): void {
    this.startTime = Date.now();
    console.log(`🚀 実行開始: ${graph.feature}`);
    console.log(`📊 総タスク数: ${graph.tasks.length}`);
  }

  startPhase(phaseNumber: number): void {
    this.currentPhase = phaseNumber;
    console.log(`\n🔄 Phase ${phaseNumber} 開始`);
  }

  completePhase(phaseNumber: number, results: ExecutionResult[]): void {
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;
    console.log(
      `✅ Phase ${phaseNumber} 完了: ${successCount}/${totalCount} タスク成功`
    );
  }

  recordTask(result: ExecutionResult): void {
    this.results.set(result.taskId, result);
    const status = result.success ? "✅" : "❌";
    console.log(
      `${status} ${result.taskId}: ${result.duration}ms (${result.output})`
    );
  }

  generateReport(): string {
    const totalTasks = this.results.size;
    const successTasks = Array.from(this.results.values()).filter(
      (r) => r.success
    ).length;
    const totalDuration = Date.now() - this.startTime;

    let report = "\n# 実行レポート\n\n";
    report += `## 統計\n`;
    report += `- 総タスク数: ${totalTasks}\n`;
    report += `- 成功: ${successTasks}\n`;
    report += `- 失敗: ${totalTasks - successTasks}\n`;
    report += `- 総時間: ${totalDuration}ms\n\n`;

    return report;
  }
}

/**
 * 並列実行エンジン
 */
export class ParallelExecutor {
  private maxConcurrency: number = 5;
  private tracker: ProgressTracker = new ProgressTracker();
  private phaseResults: PhaseResult[] = [];

  constructor(maxConcurrency?: number) {
    if (maxConcurrency) {
      this.maxConcurrency = maxConcurrency;
    }
  }

  /**
   * タスクグラフを実行
   */
  async execute(graph: TaskGraph): Promise<PhaseResult[]> {
    this.tracker.start(graph);

    for (const plan of graph.executionPlan) {
      const phaseResult = await this.executePhase(graph, plan);
      this.phaseResults.push(phaseResult);

      // フェーズ内で失敗がある場合、次のフェーズに進むか確認
      const hasFailures = phaseResult.tasks.some((t) => !t.success);
      if (hasFailures) {
        console.log(
          `⚠️ Phase ${plan.group} で失敗あり。続行しますか？ (y/n)`
        );
        // 実際の実装ではユーザー入力を待つ
      }
    }

    console.log(this.tracker.generateReport());
    return this.phaseResults;
  }

  /**
   * 1フェーズ分のタスクを実行
   */
  private async executePhase(
    graph: TaskGraph,
    plan: { group: number; tasks: string[]; canRunInParallel: boolean }
  ): Promise<PhaseResult> {
    this.tracker.startPhase(plan.group);
    const startTime = Date.now();

    const tasks = plan.tasks
      .map((taskId) => graph.tasks.find((t) => t.id === taskId))
      .filter((t): t is AtomicTask => t !== undefined);

    let results: ExecutionResult[];

    if (plan.canRunInParallel && tasks.length > 1) {
      results = await this.executeInParallel(tasks);
    } else {
      results = await this.executeSequentially(tasks);
    }

    const endTime = Date.now();

    this.tracker.completePhase(plan.group, results);

    return {
      phase: plan.group,
      tasks: results,
      startTime,
      endTime,
      duration: endTime - startTime,
    };
  }

  /**
   * タスクを並列実行
   */
  private async executeInParallel(
    tasks: AtomicTask[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // 並列実行のバッチ処理
    for (let i = 0; i < tasks.length; i += this.maxConcurrency) {
      const batch = tasks.slice(i, i + this.maxConcurrency);
      const batchResults = await Promise.all(
        batch.map((task) => this.executeTask(task))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * タスクを順次実行
   */
  private async executeSequentially(
    tasks: AtomicTask[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const task of tasks) {
      const result = await this.executeTask(task);
      results.push(result);

      // 失敗した場合、残りのタスクを実行するか確認
      if (!result.success) {
        console.log(`⚠️ タスク ${task.id} が失敗しました。続行しますか？`);
      }
    }

    return results;
  }

  /**
   * 個別のタスクを実行
   */
  private async executeTask(task: AtomicTask): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 実際の実装では、ここでサブエージェントを起動
      // Task toolを使って専門エージェントに委任

      const output = await this.runSubAgent(task);
      const duration = Date.now() - startTime;

      const result: ExecutionResult = {
        taskId: task.id,
        success: true,
        duration,
        output,
      };

      this.tracker.recordTask(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ExecutionResult = {
        taskId: task.id,
        success: false,
        duration,
        output: "実行失敗",
        errors: [error instanceof Error ? error.message : String(error)],
      };

      this.tracker.recordTask(result);
      return result;
    }
  }

  /**
   * サブエージェントを起動してタスクを実行
   */
  private async runSubAgent(task: AtomicTask): Promise<string> {
    // 実際の実装ではTask toolを使用
    // ここではモック実装
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`${task.title} 完了`);
      }, 100);
    });
  }
}

/**
 * ファイルレベルのロック機構
 */
export class FileLockManager {
  private locks: Set<string> = new Set();

  async acquire(filePath: string): Promise<boolean> {
    if (this.locks.has(filePath)) {
      return false;
    }
    this.locks.add(filePath);
    return true;
  }

  release(filePath: string): void {
    this.locks.delete(filePath);
  }

  getLockedFiles(): string[] {
    return Array.from(this.locks);
  }
}

/**
 * 検証エンジン
 */
export class ValidationEngine {
  /**
   * タスクの検証基準をチェック
   */
  async validate(task: AtomicTask): Promise<{
    passed: boolean;
    results: string[];
  }> {
    const results: string[] = [];

    for (const criterion of task.validationCriteria) {
      const result = await this.checkCriterion(task, criterion);
      results.push(result);
    }

    const passed = results.every((r) => r.includes("✅"));

    return {
      passed,
      results,
    };
  }

  private async checkCriterion(
    task: AtomicTask,
    criterion: string
  ): Promise<string> {
    // 実際の実装では検証ロジックを実行
    // ここではモック
    return `✅ ${criterion}`;
  }
}
