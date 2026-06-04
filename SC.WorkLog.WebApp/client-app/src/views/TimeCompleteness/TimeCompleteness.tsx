import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfWeek, format, parseISO, startOfWeek } from 'date-fns'
import { useAuth } from 'helpers/services/AuthContext'
import {
  getActiveEmployees,
  getTimeCompleteness,
  type DailyTimeCompletenessRowDto,
  type DailyTimeCompletenessStatus,
  type EmployeeDto,
} from 'helpers/services/worklog-api'
import { Alert, AlertDescription, AlertTitle } from 'components/ui/alert'
import { Badge } from 'components/ui/badge'
import { Button } from 'components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Input } from 'components/ui/input'
import { Label } from 'components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from 'components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table'
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Filter,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { cn } from 'lib/utils'

const toApiDate = (date: Date) => format(date, 'yyyy-MM-dd')
const formatHours = (hours: number) => `${hours.toLocaleString('en-US', { maximumFractionDigits: 2 })}h`

const getErrorMessage = (error: unknown) => {
  const response = typeof error === 'object' && error && 'response' in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const errors = response?.data && typeof response.data === 'object'
    ? ((response.data as { errors?: unknown; Errors?: unknown }).errors ?? (response.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (response?.status === 401) return 'Authentication required. Please sign in again.'
  if (response?.status === 403) return 'You do not have permission to view time completeness.'
  if (Array.isArray(errors) && errors.every((item) => typeof item === 'string')) return errors.join(' ')
  if (error instanceof Error && error.message) return error.message
  return 'Unable to load time completeness. Please try again.'
}

const completenessLabel = (status: DailyTimeCompletenessStatus) => {
  if (status === 'MissingHours') return 'Missing hours'
  if (status === 'OvertimePending') return 'Overtime pending'
  if (status === 'OvertimeApproved') return 'Overtime approved'
  return 'OK'
}

const completenessClass = (status: DailyTimeCompletenessStatus) => {
  if (status === 'MissingHours') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  if (status === 'OvertimePending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  if (status === 'OvertimeApproved') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
}

type StatusFilter = DailyTimeCompletenessStatus | 'All'

export default function TimeCompletenessPage() {
  const { isAdmin } = useAuth()
  const [dateFrom, setDateFrom] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [dateTo, setDateTo] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const [employeeFilter, setEmployeeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [rows, setRows] = useState<DailyTimeCompletenessRowDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const loadCompleteness = useCallback(async () => {
    if (!isAdmin) {
      setEmployees([])
      setRows([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const [completeness, employeeResponse] = await Promise.all([
        getTimeCompleteness({
          employeeId: employeeFilter === 'All' ? undefined : employeeFilter,
          dateFrom: toApiDate(dateFrom),
          dateTo: toApiDate(dateTo),
          status: statusFilter === 'All' ? undefined : statusFilter,
        }),
        getActiveEmployees(),
      ])
      setRows(completeness.rows)
      setEmployees(employeeResponse)
    } catch (error) {
      setRows([])
      setEmployees([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, employeeFilter, isAdmin, statusFilter])

  useEffect(() => {
    void loadCompleteness()
  }, [loadCompleteness])

  useEffect(() => {
    const refresh = () => void loadCompleteness()
    window.addEventListener('worklog:time-entry-saved', refresh)
    window.addEventListener('worklog:time-entry-updated', refresh)
    window.addEventListener('worklog:leave-request-saved', refresh)
    window.addEventListener('worklog:leave-request-updated', refresh)
    window.addEventListener('worklog:overtime-request-updated', refresh)
    return () => {
      window.removeEventListener('worklog:time-entry-saved', refresh)
      window.removeEventListener('worklog:time-entry-updated', refresh)
      window.removeEventListener('worklog:leave-request-saved', refresh)
      window.removeEventListener('worklog:leave-request-updated', refresh)
      window.removeEventListener('worklog:overtime-request-updated', refresh)
    }
  }, [loadCompleteness])

  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return (a.employeeName ?? '').localeCompare(b.employeeName ?? '')
  }), [rows])

  const completeCount = rows.filter((row) => row.status === 'OK').length
  const missingCount = rows.filter((row) => row.status === 'MissingHours').length
  const overtimePendingCount = rows.filter((row) => row.status === 'OvertimePending').length

  const resetFilters = () => {
    setDateFrom(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setDateTo(endOfWeek(new Date(), { weekStartsOn: 1 }))
    setEmployeeFilter('All')
    setStatusFilter('All')
  }

  const filtersContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Date from</Label>
        <Input type="date" value={toApiDate(dateFrom)} onChange={(event) => setDateFrom(parseISO(event.target.value))} />
      </div>

      <div className="space-y-2">
        <Label>Date to</Label>
        <Input type="date" value={toApiDate(dateTo)} onChange={(event) => setDateTo(parseISO(event.target.value))} />
      </div>

      <div className="space-y-2">
        <Label>Employee</Label>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="MissingHours">Missing hours</SelectItem>
            <SelectItem value="OvertimePending">Overtime pending</SelectItem>
            <SelectItem value="OvertimeApproved">Overtime approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" className="w-full" onClick={resetFilters}>
        Reset filters
      </Button>
    </div>
  )

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">This page is only available for administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CheckSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Completeness</h1>
          <p className="text-sm text-muted-foreground">
            {completeCount} complete, {missingCount} missing, {overtimePendingCount} overtime pending
          </p>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load Time Completeness</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Complete Days</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {completeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardDescription>Missing Hours</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {missingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardDescription>Overtime Pending</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-5 w-5 text-amber-500" />
              {overtimePendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="hidden lg:block">
        <CardContent className="pt-6">
          {filtersContent}
        </CardContent>
      </Card>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden w-full">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {filtersContent}
          </div>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle>Daily Completeness</CardTitle>
          <CardDescription>Backend-owned expected, worked, leave, missing and overtime summary.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading time completeness...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No data found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-sm border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Worked</TableHead>
                      <TableHead className="text-right">Leave</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Missing</TableHead>
                      <TableHead className="text-right">Overtime</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row) => (
                      <TableRow key={`${row.employeeId}-${row.date}`} className={cn(row.status === 'MissingHours' && 'bg-red-50/50 dark:bg-red-950/10')}>
                        <TableCell className="font-medium">{row.employeeName ?? 'Unknown employee'}</TableCell>
                        <TableCell>{format(parseISO(row.date), 'EEE, MMM d')}</TableCell>
                        <TableCell className="text-right font-mono">{formatHours(row.workItemHours)}</TableCell>
                        <TableCell className="text-right font-mono">{row.leaveHours > 0 ? formatHours(row.leaveHours) : '-'}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatHours(row.dailyTotal)}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{formatHours(row.expectedDailyHours)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{row.missingHours > 0 ? formatHours(row.missingHours) : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-blue-600">{row.overtimeHours > 0 ? formatHours(row.overtimeHours) : '-'}</TableCell>
                        <TableCell>
                          <CompletenessBadge status={row.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {sortedRows.map((row) => (
                  <Card key={`${row.employeeId}-${row.date}`} className={cn('py-3', row.status === 'MissingHours' && 'border-red-200 dark:border-red-900')}>
                    <CardContent>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{row.employeeName ?? 'Unknown employee'}</p>
                          <p className="text-sm text-muted-foreground">{format(parseISO(row.date), 'EEE, MMM d, yyyy')}</p>
                        </div>
                        <CompletenessBadge status={row.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <Metric label="Worked" value={formatHours(row.workItemHours)} />
                        <Metric label="Leave" value={row.leaveHours > 0 ? formatHours(row.leaveHours) : '-'} />
                        <Metric label="Total" value={formatHours(row.dailyTotal)} />
                        <Metric label="Expected" value={formatHours(row.expectedDailyHours)} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                        <Metric label="Missing" value={row.missingHours > 0 ? formatHours(row.missingHours) : '-'} />
                        <Metric label="Overtime" value={row.overtimeHours > 0 ? formatHours(row.overtimeHours) : '-'} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CompletenessBadge({ status }: { status: DailyTimeCompletenessStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-medium', completenessClass(status))}>
      {completenessLabel(status)}
    </Badge>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono font-medium">{value}</p>
    </div>
  )
}
