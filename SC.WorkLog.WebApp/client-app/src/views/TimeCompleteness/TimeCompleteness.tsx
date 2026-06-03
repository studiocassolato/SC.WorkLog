import { useState } from 'react'
import { useWorkLog } from 'lib/worklog-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { StatusBadge } from 'components/status-badges'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from 'components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover'
import { Calendar } from 'components/ui/calendar'
import { Label } from 'components/ui/label'
import { CalendarIcon, Filter, AlertTriangle, CheckCircle2, Clock, CheckSquare } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { cn } from 'lib/utils'
import type { Employee } from 'lib/mock-data'

type CompletenessStatus = 'OK' | 'Missing hours' | 'Overtime pending' | 'Overtime approved'

interface DayCompleteness {
  employee: Employee
  date: string
  workItemHours: number
  leaveHours: number
  total: number
  expected: number
  delta: number
  status: CompletenessStatus
}

export default function TimeCompletenessPage() {
  const { employees, timeEntries, leaveRequests, overtimeRequests, role, currentUser } = useWorkLog()

  const [dateFrom, setDateFrom] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [dateTo, setDateTo] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Generate day-by-day completeness data
  const days = eachDayOfInterval({ start: dateFrom, end: dateTo })
  // For employees, only show their own data
  const activeEmployees = role === 'Employee' 
    ? employees.filter((e) => e.id === currentUser.id)
    : employees.filter((e) => e.active)

  const completenessData: DayCompleteness[] = []

  for (const employee of activeEmployees) {
    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd')

      // Skip weekends
      const dayOfWeek = day.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      // Calculate work item hours
      const workItemHours = timeEntries
        .filter((e) => e.employeeId === employee.id && e.date === dateStr)
        .reduce((sum, e) => sum + e.time, 0)

      // Calculate approved leave hours
      const leaveHours = leaveRequests
        .filter(
          (l) =>
            l.employeeId === employee.id && l.date === dateStr && l.status === 'Approved'
        )
        .reduce((sum, l) => sum + l.hours, 0)

      const total = workItemHours + leaveHours
      const expected = employee.expectedDailyHours
      const delta = total - expected

      // Determine status
      let status: CompletenessStatus = 'OK'
      if (delta < 0) {
        status = 'Missing hours'
      } else if (delta > 0) {
        const overtime = overtimeRequests.find(
          (o) => o.employeeId === employee.id && o.date === dateStr
        )
        if (overtime?.status === 'Approved') {
          status = 'Overtime approved'
        } else if (overtime?.status === 'Pending approval') {
          status = 'Overtime pending'
        }
      }

      completenessData.push({
        employee,
        date: dateStr,
        workItemHours,
        leaveHours,
        total,
        expected,
        delta,
        status,
      })
    }
  }

  // Apply filters
  const filteredData = completenessData.filter((item) => {
    if (employeeFilter !== 'all' && item.employee.id !== employeeFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    return true
  })

  // Sort by date descending, then employee name
  const sortedData = [...filteredData].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return `${a.employee.lastName}${a.employee.firstName}`.localeCompare(
      `${b.employee.lastName}${b.employee.firstName}`
    )
  })

  // Summary stats
  const totalMissing = filteredData.filter((d) => d.status === 'Missing hours').length
  const totalOvertimePending = filteredData.filter((d) => d.status === 'Overtime pending').length
  const totalOK = filteredData.filter((d) => d.status === 'OK').length

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Date From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Date To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateTo, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Employee</Label>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {activeEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="Missing hours">Missing hours</SelectItem>
            <SelectItem value="Overtime pending">Overtime pending</SelectItem>
            <SelectItem value="Overtime approved">Overtime approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setDateFrom(startOfWeek(new Date(), { weekStartsOn: 1 }))
          setDateTo(endOfWeek(new Date(), { weekStartsOn: 1 }))
          setEmployeeFilter('all')
          setStatusFilter('all')
        }}
      >
        Reset filters
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CheckSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Completeness</h1>
          <p className="text-sm text-muted-foreground">
            {totalOK} complete, {totalMissing} missing, {totalOvertimePending} pending
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Complete Days</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {totalOK}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardDescription>Missing Hours</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {totalMissing}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardDescription>Overtime Pending</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-5 w-5 text-amber-500" />
              {totalOvertimePending}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, 'MMM d')} - {format(dateTo, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {activeEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="Missing hours">Missing hours</SelectItem>
            <SelectItem value="Overtime pending">Overtime pending</SelectItem>
            <SelectItem value="Overtime approved">Overtime approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Filters */}
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
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border rounded-sm overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Work Hours</TableHead>
              <TableHead className="text-right">Leave</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow
                key={`${item.employee.id}-${item.date}`}
                className={cn(item.status === 'Missing hours' && 'bg-red-50/50 dark:bg-red-950/10')}
              >
                <TableCell className="font-medium">
                  {item.employee.firstName} {item.employee.lastName}
                </TableCell>
                <TableCell>{format(new Date(item.date), 'EEE, MMM d')}</TableCell>
                <TableCell className="text-right font-mono">{item.workItemHours}h</TableCell>
                <TableCell className="text-right font-mono">
                  {item.leaveHours > 0 ? `${item.leaveHours}h` : '-'}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">{item.total}h</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {item.expected}h
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono font-medium',
                    item.delta < 0 && 'text-red-600',
                    item.delta > 0 && 'text-blue-600'
                  )}
                >
                  {item.delta > 0 ? '+' : ''}
                  {item.delta}h
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedData.map((item) => (
          <Card
            key={`${item.employee.id}-${item.date}`}
            className={cn(
              "py-3",
              item.status === 'Missing hours' && 'border-red-200 dark:border-red-900'
            )}
          >
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.employee.firstName} {item.employee.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(item.date), 'EEE, MMM d, yyyy')}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Work</p>
                  <p className="font-mono font-medium">{item.workItemHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leave</p>
                  <p className="font-mono font-medium">{item.leaveHours > 0 ? `${item.leaveHours}h` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-mono font-medium">{item.total}h</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delta</p>
                  <p
                    className={cn(
                      'font-mono font-medium',
                      item.delta < 0 && 'text-red-600',
                      item.delta > 0 && 'text-blue-600'
                    )}
                  >
                    {item.delta > 0 ? '+' : ''}
                    {item.delta}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg">No data found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}
    </div>
  )
}
