import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()

const checks = [
  {
    file: 'src/composables/useInstantListActions.js',
    patterns: ['withActionLock', 'isActionLoading', 'replaceById', 'removeById']
  },
  {
    file: 'src/views/MemoManagement.vue',
    patterns: ['useInstantListActions', 'withActionLock', 'recalcStatsByList']
  },
  {
    file: 'src/views/MessageManagement.vue',
    patterns: ['useInstantListActions', 'withActionLock', 'removeById']
  },
  {
    file: 'src/composables/useQuotationHistory.js',
    patterns: ['useInstantListActions', 'withActionLock', 'removeById']
  },
  {
    file: 'src/views/approval.vue',
    patterns: ['useInstantListActions', 'withActionLock', 'isActionLoading']
  },
  {
    file: 'src/views/approvalDetail.vue',
    patterns: ['actionLoading', 'meta.status =', 'await quotationApi.approve']
  },
  {
    file: 'src/views/BeamQuotationHistory.vue',
    patterns: ['useInstantListActions', 'withActionLock', 'removeById']
  },
  {
    file: 'src/composables/useNotificationCenter.js',
    patterns: ['actionLoading', 'markAllAsRead', 'noticeList.value = noticeList.value.map']
  },
  {
    file: 'src/utils/request.js',
    patterns: ['_t: Date.now()', "method === 'get'"]
  }
]

const errors = []

for (const check of checks) {
  const abs = resolve(root, check.file)
  if (!existsSync(abs)) {
    errors.push(`[missing] ${check.file}`)
    continue
  }

  const content = readFileSync(abs, 'utf8')
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      errors.push(`[pattern missing] ${check.file} -> ${pattern}`)
    }
  }
}

if (errors.length) {
  console.error('Instant-update regression check failed:')
  for (const line of errors) console.error(`- ${line}`)
  process.exit(1)
}

console.log('Instant-update regression check passed.')
