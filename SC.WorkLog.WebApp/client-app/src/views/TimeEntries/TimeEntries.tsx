import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useWorkLog } from 'lib/worklog-context'
import { Card, CardContent } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Input } from 'components/ui/input'
import { LevelBadge } from 'components/status-badges'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog'
import { Label } from 'components/ui/label'
import { Textarea } from 'components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover'
import { Calendar } from 'components/ui/calendar'
import { CalendarIcon, Filter, Edit2, Search, Download, ExternalLink, Clock } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from 'lib/utils'

export default function TimeEntriesPage() {
  const {
    role,
    timeEntries,
    workItems,
    projects,
    customers,
    employees,
    currentUser,
    updateTimeEntry,
  } = useWorkLog()

  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const history = useHistory()

  const [editEntry, setEditEntry] = useState<typeof timeEntries[0] | null>(null)
  const [editApprovedTime, setEditApprovedTime] = useState<number>(0)
  const [editAdminNote, setEditAdminNote] = useState<string>('')

  // Filter time entries
  const filteredEntries = timeEntries.filter((entry) => {
    // Date range
    if (entry.date < dateFrom.toISOString().split('T')[0]) return false
    if (entry.date > dateTo.toISOString().split('T')[0]) return false

    // For employees, only show their own entries
    if (role === 'Employee' && entry.employeeId !== currentUser.id) return false

    // Employee filter (admin only)
    if (role === 'Admin' && employeeFilter !== 'all' && entry.employeeId !== employeeFilter)
      return false

    // Customer filter
    if (customerFilter !== 'all') {
      const workItem = workItems.find((w) => w.id === entry.workItemId)
      const project = workItem ? projects.find((p) => p.id === workItem.projectId) : null
      if (project?.customerId !== customerFilter) return false
    }

    // Status filter
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false

    return true
  })

  // Sort by date descending
  const sortedEntries = [...filteredEntries].sort((a, b) => b.date.localeCompare(a.date))

  const getWorkItem = (workItemId: string) => workItems.find((w) => w.id === workItemId)
  const getProject = (projectId: string) => projects.find((p) => p.id === projectId)
  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId)
  const getEmployee = (employeeId: string) => employees.find((e) => e.id === employeeId)

  const handleExportCSV = () => {
    const headers = ['Date', 'Employee', 'Customer', 'Project', 'Work Item', 'Hours', 'Approved Hours', 'Status', 'Notes']
    const rows = sortedEntries.map((entry) => {
      const employee = getEmployee(entry.employeeId)
      const workItem = getWorkItem(entry.workItemId)
      const project = workItem ? getProject(workItem.projectId) : null
      const customer = project ? getCustomer(project.customerId) : null
      return [
        entry.date,
        employee ? `${employee.firstName} ${employee.lastName}` : '',
        customer?.companyName || '',
        project?.name || '',
        workItem?.title || '',
        entry.time.toString(),
        entry.approvedTime.toString(),
        entry.status,
        entry.notes || ''
      ]
    })

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `time-entries-${format(dateFrom, 'yyyy-MM-dd')}-${format(dateTo, 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleEditEntry = (entry: typeof timeEntries[0]) => {
    setEditEntry(entry)
    setEditApprovedTime(entry.approvedTime)
    setEditAdminNote(entry.adminNote || '')
  }

  const handleSaveEdit = () => {
    if (!editEntry) return
    updateTimeEntry(editEntry.id, {
      approvedTime: editApprovedTime,
      adminNote: editAdminNote || null,
    })
    setEditEntry(null)
  }

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

      {role === 'Admin' && (
        <div className="space-y-2">
          <Label>Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Customer</Label>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.companyName}
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
            <SelectItem value="Pending approval">Pending approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setDateFrom(subDays(new Date(), 7))
          setDateTo(new Date())
          setEmployeeFilter('all')
          setCustomerFilter('all')
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Entries</h1>
            <p className="text-sm text-muted-foreground">
              {sortedEntries.length} entries, {sortedEntries.reduce((s, e) => s + e.time, 0).toFixed(1)}h total
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
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

        {role === 'Admin' && (
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending approval">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
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
      <Card className="hidden md:block py-0 overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              {role === 'Admin' && <TableHead>Employee</TableHead>}
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Work Item</TableHead>
              <TableHead className="text-right">Time</TableHead>
              {role === 'Admin' && (
                <>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </>
              )}
              {role === 'Admin' && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={role === 'Admin' ? 10 : 6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No time entries found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your date range</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
            sortedEntries.map((entry) => {
              const workItem = getWorkItem(entry.workItemId)
              const project = workItem ? getProject(workItem.projectId) : null
              const customer = project ? getCustomer(project.customerId) : null
              const employee = getEmployee(entry.employeeId)
              const value = entry.approvedTime * entry.projectRateSnapshot

              return (
                <TableRow key={entry.id} className="group">
                  <TableCell className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                  {role === 'Admin' && (
                    <TableCell className="text-muted-foreground">
                      {employee?.firstName} {employee?.lastName}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{customer?.companyName || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{project?.name || '-'}</TableCell>
                  <TableCell className="max-w-xs">
                    {workItem ? (
                      <button
                        className="text-left truncate hover:text-primary hover:underline flex items-center gap-1"
                        onClick={() => history.push(`/work-items/${workItem.id}`)}
                      >
                        <span className="truncate">{workItem.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                      </button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{entry.time}h</TableCell>
                  {role === 'Admin' && (
                    <>
                      <TableCell className="text-right font-mono tabular-nums">
                        <span
                          className={cn(
                            entry.approvedTime !== entry.time && 'text-amber-600 font-medium'
                          )}
                        >
                          {entry.approvedTime}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <LevelBadge level={entry.employeeLevelSnapshot} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {value > 0
                          ? value.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })
                          : '-'}
                      </TableCell>
                    </>
                  )}
                  {role === 'Admin' && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })
            )}
          </TableBody>
          </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedEntries.map((entry) => {
          const workItem = getWorkItem(entry.workItemId)
          const project = workItem ? getProject(workItem.projectId) : null
          const customer = project ? getCustomer(project.customerId) : null
          const employee = getEmployee(entry.employeeId)
          const value = entry.approvedTime * entry.projectRateSnapshot

          return (
            <Card key={entry.id} className="py-3">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{workItem?.title || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer?.companyName} - {project?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                      {role === 'Admin' && ` - ${employee?.firstName} ${employee?.lastName}`}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-medium">{entry.time}h</p>
                    {role === 'Admin' && entry.approvedTime !== entry.time && (
                      <p className="text-xs text-amber-600">Approved: {entry.approvedTime}h</p>
                    )}
                    {role === 'Admin' && value > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {value.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                      </p>
                    )}
                  </div>
                </div>
                {role === 'Admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => handleEditEntry(entry)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Approved Time
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {sortedEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg">No time entries found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}

      {/* Edit Dialog (Admin) */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Adjust the approved time for this entry</DialogDescription>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium">{getWorkItem(editEntry.workItemId)?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {getEmployee(editEntry.employeeId)?.firstName}{' '}
                  {getEmployee(editEntry.employeeId)?.lastName} -{' '}
                  {format(new Date(editEntry.date), 'MMM d, yyyy')}
                </p>
                <p className="text-sm mt-1">Logged: {editEntry.time}h</p>
              </div>

              <div className="space-y-2">
                <Label>Approved Time (hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editApprovedTime}
                  onChange={(e) => setEditApprovedTime(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Admin Note (optional)</Label>
                <Textarea
                  placeholder="Reason for adjustment"
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
