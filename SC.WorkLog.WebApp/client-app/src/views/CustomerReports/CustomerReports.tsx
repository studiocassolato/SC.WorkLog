import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useAuth } from "helpers/services/AuthContext"
import {
  getCustomerReport,
  getCustomers,
  searchProjects,
  type CustomerDto,
  type CustomerReportDto,
  type CustomerReportWorkItemRowDto,
  type ProjectListItemDto,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Button } from "components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import {
  BarChart3,
  Building2,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]
const toApiDate = (date: Date) => format(date, "yyyy-MM-dd")
const formatHours = (hours: number) => `${hours.toLocaleString("en-US", { maximumFractionDigits: 2 })}h`
const formatCurrency = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })

const getErrorMessage = (error: unknown) => {
  const response = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const errors = response?.data && typeof response.data === "object"
    ? ((response.data as { errors?: unknown; Errors?: unknown }).errors ?? (response.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (response?.status === 401) return "Authentication required. Please sign in again."
  if (response?.status === 403) return "You do not have permission to view customer reports."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load the customer report. Please try again."
}

export default function ReportsPage() {
  const { isAdmin } = useAuth()
  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [projects, setProjects] = useState<ProjectListItemDto[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [selectedProject, setSelectedProject] = useState("All")
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(subMonths(new Date(), 2)))
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()))
  const [report, setReport] = useState<CustomerReportDto | null>(null)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    if (!isAdmin) {
      setCustomers([])
      setIsLoadingCustomers(false)
      return
    }

    setIsLoadingCustomers(true)
    setLoadError(null)
    try {
      const response = await getCustomers()
      setCustomers(response.filter((customer) => customer.active))
    } catch (error) {
      setCustomers([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [isAdmin])

  const loadProjects = useCallback(async (customerId: string) => {
    if (!customerId) {
      setProjects([])
      return
    }

    setIsLoadingProjects(true)
    try {
      const response = await searchProjects({ customerId })
      setProjects(response.filter((project) => project.paymentType !== "Internal"))
    } catch (error) {
      setProjects([])
      setReportError(getErrorMessage(error))
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  const loadReport = useCallback(async () => {
    if (!selectedCustomer) {
      setReport(null)
      return
    }

    setIsLoadingReport(true)
    setReportError(null)
    try {
      const response = await getCustomerReport({
        customerId: selectedCustomer,
        projectId: selectedProject === "All" ? undefined : selectedProject,
        dateFrom: toApiDate(dateFrom),
        dateTo: toApiDate(dateTo),
      })
      setReport(response)
    } catch (error) {
      setReport(null)
      setReportError(getErrorMessage(error))
    } finally {
      setIsLoadingReport(false)
    }
  }, [dateFrom, dateTo, selectedCustomer, selectedProject])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    setSelectedProject("All")
    setReport(null)
    void loadProjects(selectedCustomer)
  }, [loadProjects, selectedCustomer])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const selectedCustomerName = customers.find((customer) => customer.id === selectedCustomer)?.companyName ?? null
  const rows = report?.rows ?? []

  const projectBreakdown = useMemo(() => {
    const byProject = new Map<string, { projectId: string; projectName: string; hours: number; approvedHours: number }>()
    rows.forEach((row) => {
      const key = row.projectId
      const current = byProject.get(key) ?? { projectId: key, projectName: row.projectName ?? "Unknown project", hours: 0, approvedHours: 0 }
      current.hours += row.hours
      current.approvedHours += row.approvedHours
      byProject.set(key, current)
    })
    return Array.from(byProject.values()).sort((a, b) => b.hours - a.hours)
  }, [rows])

  const workItemBreakdown = useMemo(() => {
    const byWorkItem = new Map<string, { workItemId: string; workItemTitle: string; projectName: string; hours: number; approvedHours: number }>()
    rows.forEach((row) => {
      const key = row.workItemId
      const current = byWorkItem.get(key) ?? {
        workItemId: key,
        workItemTitle: row.workItemTitle ?? "Work item",
        projectName: row.projectName ?? "Unknown project",
        hours: 0,
        approvedHours: 0,
      }
      current.hours += row.hours
      current.approvedHours += row.approvedHours
      byWorkItem.set(key, current)
    })
    return Array.from(byWorkItem.values()).sort((a, b) => b.hours - a.hours)
  }, [rows])

  const monthlyTrend = useMemo(() => {
    const byMonth = new Map<string, { month: string; hours: number; approvedHours: number }>()
    rows.forEach((row) => {
      const month = format(parseISO(row.date), "MMM yyyy")
      const current = byMonth.get(month) ?? { month, hours: 0, approvedHours: 0 }
      current.hours += row.hours
      current.approvedHours += row.approvedHours
      byMonth.set(month, current)
    })
    return Array.from(byMonth.values())
  }, [rows])

  const approvalRate = report && report.totalHours > 0 ? (report.approvedHours / report.totalHours) * 100 : 0
  const averageRate = report && report.approvedHours > 0 ? report.workedValue / report.approvedHours : 0

  const handleExport = () => {
    if (!report || rows.length === 0) return

    const headers = ["Date", "Customer", "Project", "Work Item", "Hours", "Approved Hours", "Description"]
    const csvRows = rows.map((row) => [
      row.date,
      row.customerName ?? "",
      row.projectName ?? "",
      row.workItemTitle ?? "",
      row.hours.toString(),
      row.approvedHours.toString(),
      row.description ?? "",
    ])
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
    const csvContent = [headers, ...csvRows].map((row) => row.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `worklog-customer-report-${selectedCustomerName ?? "customer"}-${toApiDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Reports</h1>
            <p className="text-sm text-muted-foreground">
              {report ? `${formatHours(report.totalHours)} tracked, ${formatCurrency(report.workedValue)} value` : "Select a customer to load a backend report"}
            </p>
          </div>
        </div>
        <Button onClick={handleExport} disabled={!report || rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {(loadError || reportError) && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load report data</AlertTitle>
          <AlertDescription>{loadError ?? reportError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customer and date range are required by Report/GetCustomerReport.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={isLoadingCustomers}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!selectedCustomer || isLoadingProjects}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date from</Label>
              <Input type="date" value={toApiDate(dateFrom)} onChange={(event) => setDateFrom(parseISO(event.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Date to</Label>
              <Input type="date" value={toApiDate(dateTo)} onChange={(event) => setDateTo(parseISO(event.target.value))} />
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={() => void loadReport()} disabled={!selectedCustomer || isLoadingReport}>
                {isLoadingReport ? "Loading..." : "Reload Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedCustomer ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />}
          title="Select a customer"
          description="Choose a customer and date range to load the backend report."
        />
      ) : isLoadingReport ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading customer report...
        </div>
      ) : report && rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />}
          title="No report data"
          description="The selected customer has no reportable time entries for this date range."
        />
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Total Hours" value={formatHours(report.totalHours)} description={`${rows.length} report rows`} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Approved Hours" value={formatHours(report.approvedHours)} description={`${approvalRate.toFixed(1)}% approval rate`} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Worked Value" value={formatCurrency(report.workedValue)} description="Backend approved-time value" icon={<Building2 className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Avg. Hourly Value" value={formatCurrency(averageRate)} description="Per approved hour" icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="work-items">Work Items</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Hours Trend</CardTitle>
                    <CardDescription>Derived from backend report rows for display.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hours" name="Total Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="approvedHours" name="Approved Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hours by Project</CardTitle>
                    <CardDescription>Distribution across backend report projects.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={projectBreakdown.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="hours"
                          nameKey="projectName"
                          label={({ name, percent }) => `${String(name ?? "Project")} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        >
                          {projectBreakdown.slice(0, 8).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatHours(Number(value ?? 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="projects">
              <Card>
                <CardHeader>
                  <CardTitle>Project Breakdown</CardTitle>
                  <CardDescription>Grouped from the backend report rows.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Total Hours</TableHead>
                        <TableHead className="text-right">Approved Hours</TableHead>
                        <TableHead className="text-right">Approval %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectBreakdown.map((row) => (
                        <TableRow key={row.projectId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{row.projectName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatHours(row.hours)}</TableCell>
                          <TableCell className="text-right">{formatHours(row.approvedHours)}</TableCell>
                          <TableCell className="text-right">{row.hours > 0 ? ((row.approvedHours / row.hours) * 100).toFixed(1) : 0}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="work-items">
              <Card>
                <CardHeader>
                  <CardTitle>Work Item Breakdown</CardTitle>
                  <CardDescription>Grouped from backend report rows.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Work Item</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Total Hours</TableHead>
                        <TableHead className="text-right">Approved Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workItemBreakdown.map((row) => (
                        <TableRow key={row.workItemId}>
                          <TableCell className="font-medium">{row.workItemTitle}</TableCell>
                          <TableCell>{row.projectName}</TableCell>
                          <TableCell className="text-right">{formatHours(row.hours)}</TableCell>
                          <TableCell className="text-right">{formatHours(row.approvedHours)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Report Rows</CardTitle>
                  <CardDescription>Rows returned by Report/GetCustomerReport.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:block rounded-sm border">
                    <ReportRowsTable rows={rows} />
                  </div>
                  <div className="md:hidden space-y-3">
                    {rows.map((row) => (
                      <Card key={`${row.workItemId}-${row.date}-${row.description ?? ""}`} className="py-3">
                        <CardContent className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{row.workItemTitle ?? "Work item"}</p>
                              <p className="text-sm text-muted-foreground">{row.projectName ?? "Project"} · {format(parseISO(row.date), "MMM d, yyyy")}</p>
                            </div>
                            <div className="text-right font-mono">
                              <p>{formatHours(row.hours)}</p>
                              <p className="text-sm text-muted-foreground">{formatHours(row.approvedHours)} approved</p>
                            </div>
                          </div>
                          {row.description && <p className="text-sm text-muted-foreground">{row.description}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon}
        <h3 className="font-medium text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function ReportRowsTable({ rows }: { rows: CustomerReportWorkItemRowDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Work Item</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Approved</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.workItemId}-${row.date}-${row.description ?? ""}`}>
            <TableCell>{format(parseISO(row.date), "MMM d, yyyy")}</TableCell>
            <TableCell>{row.customerName ?? "Unknown"}</TableCell>
            <TableCell>{row.projectName ?? "Unknown"}</TableCell>
            <TableCell className="font-medium">{row.workItemTitle ?? "Work item"}</TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">{row.description || "-"}</TableCell>
            <TableCell className="text-right font-mono">{formatHours(row.hours)}</TableCell>
            <TableCell className="text-right font-mono">{formatHours(row.approvedHours)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
