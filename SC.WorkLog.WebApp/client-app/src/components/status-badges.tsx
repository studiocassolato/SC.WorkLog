import { cn } from 'lib/utils'
import { Badge } from 'components/ui/badge'
import type {
  WorkItemStatus,
  WorkItemPriority,
  RequestStatus,
} from 'lib/mock-data'

export function StatusBadge({ status }: { status: WorkItemStatus | RequestStatus | string }) {
  const variants: Record<string, string> = {
    // Work item statuses
    New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    Open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'In progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'Code review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'Under analysis': 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-400',
    'Waiting for customer': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    Closed: 'bg-slate-200 text-slate-600 dark:bg-slate-800/50 dark:text-slate-500',
    'Happy customer': 'bg-slate-200 text-slate-600 dark:bg-slate-800/50 dark:text-slate-500',
    // Request statuses
    'Pending approval': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    // Time completeness
    OK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Missing hours': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'Overtime pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'Overtime approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', variants[status] || '')}>
      {status}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: WorkItemPriority }) {
  const variants: Record<WorkItemPriority, string> = {
    Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400',
    Normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', variants[priority])}>
      {priority}
    </Badge>
  )
}

export function LevelBadge({ level }: { level: 'Junior' | 'Mid' | 'Senior' }) {
  const variants: Record<string, string> = {
    Junior: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Mid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Senior: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', variants[level])}>
      {level}
    </Badge>
  )
}

export function PaymentTypeBadge({
  type,
}: {
  type: 'Time & material' | 'Fixed price' | 'Annual retainer' | 'Internal'
}) {
  const variants: Record<string, string> = {
    'Time & material': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Fixed price': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    'Annual retainer': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Internal: 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400',
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', variants[type])}>
      {type}
    </Badge>
  )
}

export function LeaveTypeBadge({ type }: { type: 'Vacation' | 'Permission' }) {
  const variants: Record<string, string> = {
    Vacation: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    Permission: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', variants[type])}>
      {type}
    </Badge>
  )
}
