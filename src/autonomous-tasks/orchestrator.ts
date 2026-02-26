/**
 * Autonomous Task Orchestrator
 * 高レベルな機能要求から実行までを自動化するメインオーケストレーター
 */

import { TaskGraph, decomposeFeature, generateProgressReport } from "./decomposer";
import { ParallelExecutor } from "./executor";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface OrchestratorConfig {
  maxConcurrency?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * プロジェクトコンテキストを収集
 */
function collectProjectContext(): string {
  const context: string[] = [];

  // package.json
  const packagePath = join(process.cwd(), "package.json");
  if (existsSync(packagePath)) {
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    context.push(`## Dependencies\n${Object.keys(pkg.dependencies || {}).join(", ")}`);
  }

  // プロジェクト構造
  context.push(`\n## Project Structure\n- Next.js 15.2.4\n- Turso (SQLite)\n- Clerk Auth\n- MCP Server`);

  return context.join("\n");
}

/**
 * オーケストレーター
 */
export class TaskOrchestrator {
  private config: OrchestratorConfig;
  private executor: ParallelExecutor;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency || 5,
      dryRun: config.dryRun || false,
      verbose: config.verbose || false,
    };
    this.executor = new ParallelExecutor(this.config.maxConcurrency);
  }

  /**
   * メイン処理: 機能要求を実行可能なタスクに分解して実行
   */
  async orchestrate(feature: string): Promise<{
    taskGraph: TaskGraph;
    results: any;
  }> {
    console.log("🎯 Autonomous Task Orchestrator\n");

    // Step 1: プロジェクトコンテキストを収集
    console.log("📂 プロジェクトコンテキストを収集中...");
    const projectContext = collectProjectContext();

    // Step 2: タスク分解
    console.log("🔨 タスクを分解中...");
    const taskGraph = await decomposeFeature(feature, projectContext);

    // Step 3: 進捗レポートを表示
    console.log("\n" + generateProgressReport(taskGraph));

    // Step 4: 確認
    if (!this.config.dryRun) {
      console.log("⏳ 5秒後に実行を開始します（Ctrl+Cでキャンセル）...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      console.log("🔍 Dry runモード: 実行しません");
      return { taskGraph, results: null };
    }

    // Step 5: 実行
    console.log("\n🚀 実行を開始します...");
    const results = await this.executor.execute(taskGraph);

    return { taskGraph, results };
  }

  /**
   * 既存のタスクグラフを実行
   */
  async executeFromGraph(taskGraph: TaskGraph): Promise<any> {
    console.log("📋 既存のタスクグラフを実行します\n");
    console.log(generateProgressReport(taskGraph));

    const results = await this.executor.execute(taskGraph);
    return results;
  }

  /**
   * 対話モードでタスクを管理
   */
  async interactive(): Promise<void> {
    console.log("🎯 Autonomous Task Orchestrator - Interactive Mode\n");
    console.log("コマンド:");
    console.log("  new <feature>     - 新しい機能を追加");
    console.log("  status           - 現在のステータスを確認");
    console.log("  help             - ヘルプを表示");
    console.log("  exit             - 終了\n");

    // 実際の実装ではreadline等で対話的入力を受け付ける
  }
}

/**
 * CLIエントリーポイント
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('使用方法: yarn orchestrate "<feature description>"');
    console.log('例: yarn orchestrate "Add semantic search with embeddings"');
    process.exit(1);
  }

  const feature = args.join(" ");
  const orchestrator = new TaskOrchestrator({
    verbose: true,
  });

  try {
    const { taskGraph, results } = await orchestrator.orchestrate(feature);

    if (results) {
      console.log("\n✅ 全タスク完了！");
      console.log(`📊 実行時間: ${results.reduce((sum: number, r: any) => sum + r.duration, 0)}ms`);
    }
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// CLIから直接実行された場合
if (require.main === module) {
  main();
}
