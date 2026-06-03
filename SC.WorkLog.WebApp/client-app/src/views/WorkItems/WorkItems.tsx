import { useState, useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useWorkLog } from 'lib/worklog-context'
import { Card, CardContent } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Input } from 'components/ui/input'
import { StatusBadge, PriorityBadge } from 'components/status-badges'
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
import {
  Search,
  Filter,
  Plus,
  Clock,
  ClipboardList,
} from 'lucide-react'
import { WorkItemDetailSheet } from 'components/work-item-detail-sheet'
import { CreateWorkItemDialog } from 'components/create-work-item-dialog'
import { AddTimeDialog } from 'components/add-time-dialog'
import { cn } from 'lib/utils'

export default function WorkItemsPage() {
  const { workItems, projects, customers, employees, timeEntries, role, currentUser } = useWorkLog()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const history = useHistory()

  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>(['Open', 'In progress', 'On hold', 'Completed']) // default excludes Closed
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>(role === 'Employee' ? 'me' : 'all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [selectedWorkItem, setSelectedWorkItem] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addTimeOpen, setAddTimeOpen] = useState(false)
  const [addTimeWorkItemId, setAddTimeWorkItemId] = useState<string>('')

  // Handle create=true URL param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true)
      // Remove the param from URL
      history.replace('/work-items')
    }
  }, [location.search, history])

  // Filter work items
  const filteredWorkItems = workItems.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !(item.code ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilters.length > 0 && !statusFilters.includes(item.status)) return false
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false
    
    // Assignee filter
    if (assigneeFilter === 'me' && item.assigneeId !== currentUser.id) return false
    if (assigneeFilter === 'unassigned' && item.assigneeId !== null) return false
    if (assigneeFilter !== 'all' && assigneeFilter !== 'me' && assigneeFilter !== 'unassigned' && item.assigneeId !== assigneeFilter) return false

    if (customerFilter !== 'all') {
      const project = projects.find((p) => p.id === item.projectId)
      if (project?.customerId !== customerFilter) return false
    }

    return true
  })

  const getProject = (projectId: string) => projects.find((p) => p.id === projectId)
  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId)
  const getEmployee = (employeeId: string) => employees.find((e) => e.id === employeeId)

  const getWorkItemHours = (workItemId: string) => {
    return timeEntries
      .filter((e) => e.workItemId === workItemId)
      .reduce((sum, e) => sum + e.time, 0)
  }

  const handleAddTime = (workItemId: string) => {
    setAddTimeWorkItemId(workItemId)
    setAddTimeOpen(true)
  }

  const allStatuses = ['Open', 'In progress', 'On hold', 'Completed', 'Closed']

  const toggleStatus = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Status (multi-select)</label>
        <div className="flex flex-wrap gap-2">
          {allStatuses.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md border transition-colors",
                statusFilters.includes(status)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-input"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Customer</label>
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
        <label className="text-sm font-medium">Assignee</label>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="me">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {employees.filter(e => e.active).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setStatusFilters(['Open', 'In progress', 'On hold', 'Completed'])
          setPriorityFilter('all')
          setCustomerFilter('all')
          setAssigneeFilter(role === 'Employee' ? 'me' : 'all')
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
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Work Items</h1>
            <p className="text-sm text-muted-foreground">
              {filteredWorkItems.length} items {statusFilters.length < 5 && `(${statusFilters.join(', ')})`}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Work Item
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search work items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-40 justify-start">
                Status ({statusFilters.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                {allStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      "w-full px-3 py-1.5 text-sm rounded-md text-left transition-colors",
                      statusFilters.includes(status)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="me">Assigned to me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Customer" />
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

        {/* Mobile Filters */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
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
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card className="py-0 overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No work items found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
            filteredWorkItems.map((item) => {
              const project = getProject(item.projectId)
              const customer = project ? getCustomer(project.customerId) : null
              const assignee = item.assigneeId ? getEmployee(item.assigneeId) : null
              const hours = getWorkItemHours(item.id)

              return (
                <TableRow
                  key={item.id}
                  className={cn('cursor-pointer group', !item.assigneeId && 'bg-amber-50/50 dark:bg-amber-950/10')}
                  onClick={() => history.push(`/work-items/${item.id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium group-hover:text-primary transition-colors">{item.title}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer?.companyName || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{project?.name || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <span className="text-muted-foreground">
                        {assignee.firstName} {assignee.lastName}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{hours}h</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddTime(item.id)
                      }}
                    >
                      <Clock className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
            )}
          </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredWorkItems.map((item) => {
          const project = getProject(item.projectId)
          const customer = project ? getCustomer(project.customerId) : null
          const assignee = item.assigneeId ? getEmployee(item.assigneeId) : null
          const hours = getWorkItemHours(item.id)

          return (
            <Card
              key={item.id}
              className={cn(
                'cursor-pointer transition-colors hover:bg-accent/50 py-3',
                !item.assigneeId && 'border-amber-200 dark:border-amber-900'
              )}
              onClick={() => history.push(`/work-items/${item.id}`)}
            >
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                    </div>
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {customer?.companyName} - {project?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={item.status} />
                      <PriorityBadge priority={item.priority} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-medium">{hours}h</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {assignee ? (
                        `${assignee.firstName} ${assignee.lastName.charAt(0)}.`
                      ) : (
                        <span className="text-amber-600">Unassigned</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedWorkItem(item.id)
                    }}
                  >
                    Details
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddTime(item.id)
                    }}
                  >
                    <Clock className="mr-1 h-4 w-4" />
                    Add Time
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredWorkItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg">No work items found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      <WorkItemDetailSheet
        workItemId={selectedWorkItem}
        open={!!selectedWorkItem}
        onOpenChange={(open) => !open && setSelectedWorkItem(null)}
        onAddTime={handleAddTime}
      />

      <CreateWorkItemDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <AddTimeDialog
        open={addTimeOpen}
        onOpenChange={setAddTimeOpen}
        defaultWorkItemId={addTimeWorkItemId}
      />
    </div>
  )
}
