// ============================================
// Parallel Task Analyzer for YARIKIRU
// DAG解析と並列実行可能グループの検出
// ============================================

export interface SubTask {
  id: string
  label: string
  sort_order: number
  is_done: number
  started_at?: string
  completed_at?: string
}

export interface TaskNode {
  id: string
  label: string
  order: number
  dependencies: string[] // 依存するタスクIDのリスト
  dependents: string[] // このタスクに依存するタスクIDのリスト
  depth: number // DAGの深さ
  isStart: boolean // 開始ノード（依存なし）
  isEnd: boolean // 終了ノード依存先なし）
}

export interface ParallelGroup {
  id: string
  name: string
  tasks: TaskNode[]
  canStartAfter: string[] // 開始可能になる前に完了が必要なグループ
  estimatedTotalMinutes?: number
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface DAGAnalysis {
  nodes: TaskNode[]
  parallelGroups: ParallelGroup[]
  criticalPath: TaskNode[]
  estimatedTotalTime: number
  maxParallelism: number // 最大並列度
}

export interface HistoricalTimeData {
  taskId: string
  taskLabel: string
  estimatedMinutes: number
  actualMinutes: number
  completedAt: string
}

/**
 * タスクの依存関係を解析してDAGを構築
 * @param tasks サブタスクのリスト
 * @returns DAG解析結果
 */
export function analyzeDAG(tasks: SubTask[]): DAGAnalysis {
  // sort_order順にソート
  const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
  
  // ノードを構築
  const nodes: TaskNode[] = sortedTasks.map(task => {
    // 基本的な依存関係は sort_order に基づく
    // 直前のタスクに依存すると仮定
    const dependencies: string[] = []
    const dependents: string[] = []
    
    return {
      id: task.id,
      label: task.label,
      order: task.sort_order,
      dependencies,
      dependents,
      depth: 0,
      isStart: task.sort_order === 1,
      isEnd: false,
    }
  })
  
  // 依存関係を構築（sort_orderに基づく直前のタスク）
  for (let i = 1; i < nodes.length; i++) {
    const current = nodes[i]
    const previous = nodes[i - 1]
    
    // 基本的には直前のタスクに依存
    current.dependencies.push(previous.id)
    previous.dependents.push(current.id)
  }
  
  // 深さを計算
  calculateDepth(nodes)
  
  // 並列グループを検出
  const parallelGroups = detectParallelGroups(nodes)
  
  // クリティカルパスを計算
  const criticalPath = calculateCriticalPath(nodes)
  
  // 最大並列度を計算
  const maxParallelism = calculateMaxParallelism(nodes)
  
  return {
    nodes,
    parallelGroups,
    criticalPath,
    estimatedTotalTime: nodes.length * 15, // デフォルト: 15分/タスク
    maxParallelism,
  }
}

/**
 * 各ノードの深さを計算（開始ノードからの距離）
 */
function calculateDepth(nodes: TaskNode[]): void {
  const visited = new Set<string>()
  
  function dfs(nodeId: string, currentDepth: number): void {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    
    node.depth = Math.max(node.depth, currentDepth)
    
    for (const dependentId of node.dependents) {
      dfs(dependentId, currentDepth + 1)
    }
  }
  
  // 開始ノードから探索
  for (const node of nodes) {
    if (node.isStart) {
      dfs(node.id, 0)
    }
  }
  
  // 未訪問のノード（孤立している場合）用
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, 0)
    }
  }
}

/**
 * 並列実行可能なグループを検出
 */
function detectParallelGroups(nodes: TaskNode[]): ParallelGroup[] {
  const groups: ParallelGroup[] = []
  const processed = new Set<string>()
  
  // 深さごとにグループ化
  const depthGroups = new Map<number, TaskNode[]>()
  for (const node of nodes) {
    if (!depthGroups.has(node.depth)) {
      depthGroups.set(node.depth, [])
    }
    depthGroups.get(node.depth)!.push(node)
  }
  
  let groupId = 0
  for (const [depth, tasksAtDepth] of depthGroups) {
    if (tasksAtDepth.length === 0) continue
    
    // 同じ深さのタスクは基本的に並列実行可能
    // ただし、直接的な依存関係がある場合は別グループに
    
    const subgroups = splitByDependencies(tasksAtDepth)
    
    for (const subgroup of subgroups) {
      if (subgroup.length === 0) continue
      
      const priority = determineGroupPriority(subgroup)
      
      groups.push({
        id: `group_${groupId++}`,
        name: getGroupName(subgroup, depth),
        tasks: subgroup,
        canStartAfter: getRequiredGroups(subgroup, groups),
        priority,
      })
      
      for (const task of subgroup) {
        processed.add(task.id)
      }
    }
  }
  
  return groups
}

/**
 * 依存関係に基づいてタスクをサブグループに分割
 */
function splitByDependencies(tasks: TaskNode[]): TaskNode[][] {
  const subgroups: TaskNode[][] = []
  const processed = new Set<string>()
  
  for (const task of tasks) {
    if (processed.has(task.id)) continue
    
    const subgroup = [task]
    processed.add(task.id)
    
    // 同じ深さで、直接の依存関係がないタスクを追加
    for (const other of tasks) {
      if (other.id === task.id || processed.has(other.id)) continue
      
      const hasDependency = 
        task.dependencies.includes(other.id) ||
        task.dependents.includes(other.id) ||
        other.dependencies.includes(task.id) ||
        other.dependents.includes(task.id)
      
      if (!hasDependency) {
        subgroup.push(other)
        processed.add(other.id)
      }
    }
    
    subgroups.push(subgroup)
  }
  
  return subgroups
}

/**
 * グループの優先度を決定
 */
function determineGroupPriority(tasks: TaskNode[]): 'critical' | 'high' | 'medium' | 'low' {
  for (const task of tasks) {
    if (task.label.includes('【最優先】') || task.label.includes('🔥')) {
      return 'critical'
    }
  }
  
  for (const task of tasks) {
    if (task.label.includes('【即時】') || task.label.includes('⚡')) {
      return 'high'
    }
  }
  
  for (const task of tasks) {
    if (task.label.includes('【中期】')) {
      return 'medium'
    }
  }
  
  return 'low'
}

/**
 * グループ名を生成
 */
function getGroupName(tasks: TaskNode[], depth: number): string {
  const priority = determineGroupPriority(tasks)
  const priorityLabel = {
    critical: '最優先',
    high: '即時実行',
    medium: '中期実行',
    low: '長期実行',
  }[priority]
  
  const phaseName = `フェーズ ${depth + 1}`
  return `${phaseName} - ${priorityLabel}`
}

/**
 * 開始前に必要なグループIDを取得
 */
function getRequiredGroups(tasks: TaskNode[], existingGroups: ParallelGroup[]): string[] {
  const required: string[] = []
  
  for (const task of tasks) {
    for (const depId of task.dependencies) {
      // 依存タスクを含むグループを探す
      const groupWithDep = existingGroups.find(g => 
        g.tasks.some(t => t.id === depId)
      )
      if (groupWithDep && !required.includes(groupWithDep.id)) {
        required.push(groupWithDep.id)
      }
    }
  }
  
  return required
}

/**
 * クリティカルパスを計算
 */
function calculateCriticalPath(nodes: TaskNode[]): TaskNode[] {
  // 最長パスを探す（簡易版：深さが最大のパス）
  const maxDepth = Math.max(...nodes.map(n => n.depth))
  
  // 最深ノードからバックトラック
  const path: TaskNode[] = []
  let current = nodes.find(n => n.depth === maxDepth)
  
  while (current) {
    path.unshift(current)
    
    if (current.dependencies.length === 0) break
    
    // 依存先のうち、最も深さが大きいものを選択
    const deps = current.dependencies
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is TaskNode => n !== undefined)
    
    if (deps.length === 0) break
    
    current = deps.reduce((prev, curr) => 
      curr.depth > prev.depth ? curr : prev
    )
  }
  
  return path
}

/**
 * 最大並列度を計算
 */
function calculateMaxParallelism(nodes: TaskNode[]): number {
  // 各深さでの最大タスク数
  const depthGroups = new Map<number, number>()
  for (const node of nodes) {
    depthGroups.set(node.depth, (depthGroups.get(node.depth) || 0) + 1)
  }
  
  return Math.max(...depthGroups.values(), 1)
}

/**
 * 過去の実績データに基づいてタスク時間を予測
 * @param historicalData 過去の実績データ
 * @param taskLabel タスクラベル
 * @returns 予測時間（分）
 */
export function predictTaskTime(
  historicalData: HistoricalTimeData[],
  taskLabel: string
): number | null {
  if (historicalData.length === 0) return null
  
  // キーワード抽出（簡易版）
  const keywords = extractKeywords(taskLabel)
  
  // 類似タスクを検索
  const similarTasks = historicalData.filter(data => {
    const dataKeywords = extractKeywords(data.taskLabel)
    return keywords.some(k => dataKeywords.some(dk => dk.includes(k) || k.includes(dk)))
  })
  
  if (similarTasks.length === 0) return null
  
  // 平均時間を計算
  const avgMinutes = similarTasks.reduce((sum, t) => sum + t.actualMinutes, 0) / similarTasks.length
  
  return Math.round(avgMinutes)
}

/**
 * タスクラベルからキーワードを抽出
 */
function extractKeywords(label: string): string[] {
  // 日本語の重要なキーワードを抽出
  const importantWords = label
    .replace(/【.+?】/g, '') // タグを除去
    .replace(/（.+?）/g, '') // 括弧内を除去
    .replace(/\s+/g, '')
    .split(/[,、・]/)
    .filter(w => w.length >= 2)
  
  return importantWords
}

/**
 * 並列実行プランを生成
 * @param groups 並列グループ
 * @param historicalTimeData 過去の実績データ
 * @returns 実行プラン
 */
export function generateParallelExecutionPlan(
  groups: ParallelGroup[],
  historicalTimeData?: HistoricalTimeData[]
): {
  waves: Array<{
    waveNumber: number
    groups: ParallelGroup[]
    estimatedMinutes: number
    tasks: TaskNode[]
  }>
  totalEstimatedMinutes: number
  recommendedParallelism: number
} {
  const waves: Array<{
    waveNumber: number
    groups: ParallelGroup[]
    estimatedMinutes: number
    tasks: TaskNode[]
  }> = []
  
  const processed = new Set<string>()
  let waveNumber = 1
  
  while (processed.size < groups.reduce((sum, g) => sum + g.tasks.length, 0)) {
    // 現在のウェーブで実行可能なグループを探す
    const availableGroups = groups.filter(g => {
      // 未処理で、依存先がすべて処理済み
      if (g.tasks.some(t => processed.has(t.id))) return false
      
      const dependenciesMet = g.canStartAfter.every(reqGroupId => {
        const reqGroup = groups.find(gg => gg.id === reqGroupId)
        return reqGroup?.tasks.every(t => processed.has(t.id)) ?? false
      })
      
      return dependenciesMet
    })
    
    if (availableGroups.length === 0) break
    
    const tasksInWave = availableGroups.flatMap(g => g.tasks)
    
    // 時間を見積もる
    let estimatedMinutes = 0
    for (const task of tasksInWave) {
      const predicted = historicalTimeData
        ? predictTaskTime(historicalTimeData, task.label)
        : null
      estimatedMinutes += predicted ?? 15 // デフォルト15分
    }
    
    waves.push({
      waveNumber: waveNumber++,
      groups: availableGroups,
      estimatedMinutes,
      tasks: tasksInWave,
    })
    
    for (const task of tasksInWave) {
      processed.add(task.id)
    }
  }
  
  const totalEstimatedMinutes = waves.reduce((sum, w) => sum + w.estimatedMinutes, 0)
  
  // 推奨並列度（最大並列度と実績に基づく）
  const maxParallelism = Math.max(...waves.map(w => w.tasks.length))
  const recommendedParallelism = Math.min(maxParallelism, 4) // 最大4並列
  
  return {
    waves,
    totalEstimatedMinutes,
    recommendedParallelism,
  }
}

/**
 * Mermaid DAG定義を生成
 */
export function generateMermaidDAG(analysis: DAGAnalysis): string {
  let mermaid = 'graph TD\n'
  
  // ノード定義
  for (const node of analysis.nodes) {
    const label = node.label.replace(/"/g, '\\"').substring(0, 30)
    mermaid += `  ${node.id}[${label}]\n`
  }
  
  // エッジ定義
  for (const node of analysis.nodes) {
    for (const depId of node.dependencies) {
      mermaid += `  ${depId} --> ${node.id}\n`
    }
  }
  
  // 並列グループのサブグラフ
  for (const group of analysis.parallelGroups) {
    if (group.tasks.length > 1) {
      mermaid += `\n  subgraph ${group.id}["🔄 ${group.name}"]\n`
      for (const task of group.tasks) {
        mermaid += `    ${task.id}\n`
      }
      mermaid += '  end\n'
    }
  }
  
  return mermaid
}

/**
 * HTML可視化を生成
 */
export function generateWorkflowHTML(
  analysis: DAGAnalysis,
  plan: ReturnType<typeof generateParallelExecutionPlan>,
  goalTitle: string,
  goalId: string
): string {
  const stats = {
    totalTasks: analysis.nodes.length,
    parallelGroups: analysis.parallelGroups.length,
    waves: plan.waves.length,
    estimatedTime: plan.totalEstimatedMinutes,
    maxParallelism: analysis.maxParallelism,
  }
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${goalTitle} — 並列実行ワークフロー</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0e1a;
    --surface: #131829;
    --border: rgba(255,255,255,0.08);
    --text: #e8eaf0;
    --text-dim: #8b92b0;
    --critical: #ff4757;
    --high: #ffa502;
    --medium: #2ed573;
    --low: #70a1ff;
  }
  body { font-family: 'Noto Sans JP', sans-serif; background: var(--bg); color: var(--text); padding: 40px; }
  .container { max-width: 1400px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin: 24px 0; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 700; }
  .stat-label { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
  .wave { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .wave-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .wave-title { font-size: 16px; font-weight: 600; }
  .wave-time { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-dim); }
  .parallel-tasks { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .task-card { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 12px; }
  .task-card.critical { border-left: 3px solid var(--critical); }
  .task-card.high { border-left: 3px solid var(--high); }
  .task-card.medium { border-left: 3px solid var(--medium); }
  .task-card.low { border-left: 3px solid var(--low); }
</style>
</head>
<body>
<div class="container">
  <h1>${goalTitle}</h1>
  <div class="stats">
    <div class="stat-card"><div class="stat-value">${stats.totalTasks}</div><div class="stat-label">総タスク数</div></div>
    <div class="stat-card"><div class="stat-value">${stats.parallelGroups}</div><div class="stat-label">並列グループ</div></div>
    <div class="stat-card"><div class="stat-value">${stats.waves}</div><div class="stat-label">実行ウェーブ</div></div>
    <div class="stat-card"><div class="stat-value">${stats.estimatedTime}</div><div class="stat-label">推定時間(分)</div></div>
  </div>
  ${plan.waves.map(wave => `
  <div class="wave">
    <div class="wave-header">
      <span class="wave-title">ウェーブ ${wave.waveNumber}</span>
      <span class="wave-time">~${wave.estimatedMinutes}分</span>
    </div>
    <div class="parallel-tasks">
      ${wave.tasks.map(task => {
        const priority = determineGroupPriority([task])
        return `<div class="task-card ${priority}">${task.label}</div>`
      }).join('')}
    </div>
  </div>`).join('')}
</div>
</body>
</html>`
}
