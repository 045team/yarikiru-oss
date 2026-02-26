import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@libsql/client'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const goalId = 'e561b4b4-02ed-424b-80b4-aaf533527bf6'
const learning = `PWA実装完了:
- PWAマニフェスト、サービスワーカー、オフライン対応を実装
- モバイルファーストのレスポンシブデザイン（サイドバー非表示、ハンバーガーメニー）
- インストールプロンプトとLighthouse監査チェックリスト作成`

async function completeWork() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // 作業終了を記録
  const activeWorkPath = path.join(__dirname, '..', '.yarikiru', 'active-work.json')
  if (fs.existsSync(activeWorkPath)) {
    fs.unlinkSync(activeWorkPath)
  }

  // ゴールを完了状態に更新
  const sql = `
    UPDATE goals
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  await client.execute({ sql, args: [goalId] })

  // 学びを記録（オプション）
  console.log('✅ 作業を完了しました！')
  console.log('========================================')
  console.log('Goal ID:', goalId)
  console.log('完了時刻:', new Date().toLocaleString('ja-JP'))
  console.log('')
  console.log('📝 学び:')
  console.log(learning)
  console.log('========================================')
}

completeWork()
