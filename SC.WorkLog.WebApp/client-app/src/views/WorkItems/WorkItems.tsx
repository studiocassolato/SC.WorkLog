import { useCallback, useEffect, useMemo, useState } from "react"
import { useHistory } from "react-router-dom"
import { format, parseISO } from "date-fns"
import {
  ClipboardList,
  Clock,
  Filter,
  FolderOpen,
  Search,
  ShieldAlert,
} from "lucide-react"
import { useAuth } from "helpers/services/AuthContext"
import {
  getActiveEmployees,
  getProjects,
  getStatusConfigs,
  getWorkItems,
  type EmployeeDto,
  type ProjectListItemDto,
  type StatusConfigDto,
  type WorkItemFilter,
  type WorkItemListItemDto,
  type WorkItemOrigin,
  type WorkItemPriority,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Badge } from "components/ui/badge"
import { Button } from "components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card"
import { Checkbox } from "components/ui/checkbox"
import { Input } from "components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import { PriorityBadge, StatusBadge } from "components/status-badges"
import { WorkItemFormDialog } from "components/work-item-form-dialog"
import { cn } from "lib/utils"
import { toast } from "sonner"

type AssigneeFilter = "all" | "me" | "unassigned" | string

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to view work items."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load work items. Please try again."
}

const formatDate = (value: string | null) => {
  if (!value) return "-"
  return format(parseISO(value), "MMM d, yyyy")
}

const formatHours = (hours: number) => `${hours.toLocaleString("en-US", { maximumFractionDigits: 2 })}h`

const originLabel = (origin: WorkItemOrigin) => {
  switch (origin) {
    case "AzureDevOps":
      return "Azure DevOps"
    default:
      return origin
  }
}

const statusDisplayName = (workItem: WorkItemListItemDto) =>
  workItem.statusName || workItem.customerDisplayName || workItem.statusKey

const statusOptionName = (status: StatusConfigDto) => status.name || status.customerDisplayName || status.key

const buildWorkItemFilter = ({
  assigneeFilter,
  customerFilter,
  includeClosed,
  priorityFilter,
  projectFilter,
  search,
  statusFilter,
  currentUserEmail,
}: {
  assigneeFilter: AssigneeFilter
  customerFilter: string
  includeClosed: boolean
  priorityFilter: string
  projectFilter: string
  search: string
  statusFilter: string
  currentUserEmail: string | null | undefined
}): WorkItemFilter => {
  const filter: WorkItemFilter = {
    includeClosed,
  }

  const trimmedSearch = search.trim()
  if (trimmedSearch) filter.search = trimmedSearch
  if (projectFilter !== "all") filter.projectId = projectFilter
  if (customerFilter !== "all") filter.customerId = customerFilter
  if (statusFilter !== "all") filter.statusKey = statusFilter
  if (priorityFilter !== "all") filter.priority = priorityFilter as WorkItemPriority

  if (assigneeFilter === "me" && currentUserEmail) {
    filter.assigneeId = currentUserEmail
  } else if (assigneeFilter === "unassigned") {
    filter.unassignedOnly = true
  } else if (assigneeFilter !== "all" && assigneeFilter !== "me") {
    filter.assigneeId = assigneeFilter
  }

  return filter
}

export default function WorkItemsPage() {
  const history = useHistory()
  const { currentUser, isAdmin } = useAuth()
  const [workItems, setWorkItems] = useState<WorkItemListItemDto[]>([])
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [projects, setProjects] = useState<ProjectListItemDto[]>([])
  const [statuses, setStatuses] = useState<StatusConfigDto[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>(currentUser?.email && !isAdmin ? "me" : "all")
  const [includeClosed, setIncludeClosed] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setAssigneeFilter((value) => {
      if (value === "me" && !currentUser?.email) return "all"
      if (value === "me" && isAdmin) return "all"
      return value
    })
  }, [currentUser?.email, isAdmin])

  const filter = useMemo(() => buildWorkItemFilter({
    assigneeFilter,
    customerFilter,
    includeClosed,
    priorityFilter,
    projectFilter,
    search,
    statusFilter,
    currentUserEmail: currentUser?.email,
  }), [assigneeFilter, customerFilter, currentUser?.email, includeClosed, priorityFilter, projectFilter, search, statusFilter])

  const loadReferenceData = useCallback(async () => {
    try {
      const [projectResponse, statusResponse] = await Promise.all([
        getProjects(),
        getStatusConfigs(),
      ])
      setProjects(projectResponse)
      setStatuses(statusResponse)
      if (isAdmin) {
        setEmployees(await getActiveEmployees())
      } else {
        setEmployees([])
      }
    } catch (error) {
      setLoadError(getErrorMessage(error))
    }
  }, [isAdmin])

  const loadWorkItems = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await getWorkItems(filter)
      setWorkItems(response)
    } catch (error) {
      setWorkItems([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    void loadWorkItems()
  }, [loadWorkItems])

  const customerOptions = useMemo(() => {
    const values = new Map<string, string>()
    projects.forEach((project) => {
      if (project.customerId) values.set(project.customerId, project.customerName ?? project.customerId)
    })
    return [...values.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [projects])

  const assigneeOptions = useMemo(() => {
    const values = new Map<string, string>()
    workItems.forEach((workItem) => {
      if (workItem.assigneeId) values.set(workItem.assigneeId, workItem.assigneeName ?? workItem.assigneeId)
    })
    return [...values.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [workItems])

  const resetFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setProjectFilter("all")
    setCustomerFilter("all")
    setAssigneeFilter(currentUser?.email && !isAdmin ? "me" : "all")
    setIncludeClosed(false)
  }

  const handleSaved = async () => {
    await loadWorkItems()
    toast.success("Work item created successfully")
  }

  const filterSummary = [
    statusFilter !== "all" ? statuses.find((status) => status.key === statusFilter)?.name ?? statusFilter : null,
    priorityFilter !== "all" ? priorityFilter : null,
    projectFilter !== "all" ? projects.find((project) => project.id === projectFilter)?.name ?? "Project" : null,
    customerFilter !== "all" ? customerOptions.find((customer) => customer.id === customerFilter)?.name ?? "Customer" : null,
    assigneeFilter !== "all" ? (assigneeFilter === "me" ? "Assigned to me" : assigneeFilter === "unassigned" ? "Unassigned" : assigneeOptions.find((assignee) => assignee.id === assigneeFilter)?.name ?? "Assignee") : null,
    includeClosed ? "including closed" : null,
  ].filter(Boolean)

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.filter((status) => status.active).sort((a, b) => a.order - b.order).map((status) => (
              <SelectItem key={status.id} value={status.key}>
                {statusOptionName(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <label className="text-sm font-medium">Project</label>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
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
            {customerOptions.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
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
            {currentUser?.email && <SelectItem value="me">Assigned to me</SelectItem>}
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assigneeOptions.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="includeClosed"
          checked={includeClosed}
          onCheckedChange={(checked) => setIncludeClosed(checked === true)}
        />
        <label htmlFor="includeClosed" className="text-sm text-muted-foreground cursor-pointer">
          Include closed work items
        </label>
      </div>

      <Button variant="outline" className="w-full" onClick={resetFilters}>
        Reset filters
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Work Items</h1>
            <p className="text-sm text-muted-foreground">
              {workItems.length} items{filterSummary.length > 0 ? ` (${filterSummary.join(", ")})` : ""}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsFormOpen(true)}>
            Create Work Item
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search work items..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.filter((status) => status.active).sort((a, b) => a.order - b.order).map((status) => (
                <SelectItem key={status.id} value={status.key}>
                  {statusOptionName(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <FiltersContent />
            </PopoverContent>
          </Popover>
        </div>

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

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load work items</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

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
                <TableHead>Reporter</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                {isAdmin && <TableHead className="text-right">Approved</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Loading work items...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : workItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">{loadError ? "Work items are unavailable." : "No work items found"}</p>
                      {!loadError && <p className="text-sm text-muted-foreground">Try adjusting your filters</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                workItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn("cursor-pointer group", !item.assigneeId && "bg-amber-50/50 dark:bg-amber-950/10")}
                    tabIndex={0}
                    onClick={() => history.push(`/work-items/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        history.push(`/work-items/${item.id}`)
                      }
                    }}
                  >
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">{item.code || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[260px]">
                        <span className="font-medium group-hover:text-primary transition-colors truncate block">{item.title}</span>
                        {item.externalReference && <span className="text-xs text-muted-foreground truncate block">Ref: {item.externalReference}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.customerName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.projectName || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={statusDisplayName(item)} />
                        <Badge variant={item.isClosed ? "secondary" : "outline"} className="text-xs">
                          {item.isClosed ? "Closed" : "Open"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell><PriorityBadge priority={item.priority} /></TableCell>
                    <TableCell>
                      {item.assigneeName ? (
                        <span className="text-muted-foreground">{item.assigneeName}</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.reporter || "-"}</TableCell>
                    <TableCell>{formatDate(item.openingDate)}</TableCell>
                    <TableCell><Badge variant="outline">{originLabel(item.origin)}</Badge></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatHours(item.loggedHours)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right font-mono tabular-nums">
                        {item.approvedHours == null ? "-" : formatHours(item.approvedHours)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <Card className="border-dashed py-3">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Loading work items...</p>
            </CardContent>
          </Card>
        ) : workItems.length === 0 ? (
          <Card className="border-dashed py-3">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{loadError ? "Work items are unavailable." : "No work items found"}</p>
            </CardContent>
          </Card>
        ) : (
          workItems.map((item) => (
            <Card
              key={item.id}
              className={cn("cursor-pointer transition-colors hover:bg-accent/50 py-3", !item.assigneeId && "border-amber-200 dark:border-amber-900")}
              role="button"
              tabIndex={0}
              onClick={() => history.push(`/work-items/${item.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  history.push(`/work-items/${item.id}`)
                }
              }}
            >
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{item.code || "-"}</p>
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.customerName || "Unknown customer"} - {item.projectName || "Unknown project"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge status={statusDisplayName(item)} />
                      <PriorityBadge priority={item.priority} />
                      <Badge variant={item.isClosed ? "secondary" : "outline"}>
                        {item.isClosed ? "Closed" : "Open"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-medium">{formatHours(item.loggedHours)}</p>
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.approvedHours == null ? "-" : `${formatHours(item.approvedHours)} approved`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                  <div>
                    <span>Assignee: </span>
                    <span className={item.assigneeName ? "" : "text-amber-600"}>{item.assigneeName ?? "Unassigned"}</span>
                  </div>
                  <div className="text-right">Origin: {originLabel(item.origin)}</div>
                  <div className="col-span-2 truncate">Reporter: {item.reporter || "-"}</div>
                  <div>Opened: {formatDate(item.openingDate)}</div>
                  <div className="text-right">Closed: {formatDate(item.closingDate)}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Work Item writes and time entries pending
          </CardTitle>
          <CardDescription>
            Create and update are API-backed for Admin users. Comments and time entry actions remain pending.
          </CardDescription>
        </CardHeader>
      </Card>

      {isAdmin && (
        <WorkItemFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          projects={projects}
          statuses={statuses}
          employees={employees}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
