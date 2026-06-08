import { supabase } from './supabaseClient'

const KEY = 'groundtruth_queue'

export function queueReport(report) {
  const q = JSON.parse(localStorage.getItem(KEY) || '[]')
  q.push({ ...report, queued_at: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function getQueueCount() {
  return JSON.parse(localStorage.getItem(KEY) || '[]').length
}

export async function syncQueue() {
  const q = JSON.parse(localStorage.getItem(KEY) || '[]')
  if (q.length === 0) return 0
  let synced = 0
  const remaining = []
  for (const report of q) {
    const { queued_at, ...clean } = report
    const { error } = await supabase.from('reports').insert(clean)
    if (error) { remaining.push(report) } else { synced++ }
  }
  localStorage.setItem(KEY, JSON.stringify(remaining))
  return synced
}