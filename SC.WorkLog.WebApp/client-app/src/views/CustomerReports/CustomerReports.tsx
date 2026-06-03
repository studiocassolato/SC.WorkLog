import { useState, useMemo } from "react"
import { useWorkLog } from "lib/worklog-context"
import { Button } from "components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Label } from "components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs"
import { Calendar } from "components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { 
  Download, 
  CalendarIcon, 
  Building2, 
  Clock, 
  DollarSign, 
  TrendingUp,
  FileText,
  FolderOpen,
  BarChart3
} from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns"
import { cn } from "lib/utils"

export default function ReportsPage() {
  const { customers, projects, workItems, timeEntries } = useWorkLog()
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  })

  // Get project ID from work item ID
  const getProjectId = (workItemId: string) => {
    const workItem = workItems.find((w) => w.id === workItemId)
    return workItem?.projectId
  }

  // Get project from work item ID
  const getProject = (workItemId: string) => {
    const projectId = getProjectId(workItemId)
    return projectId ? projects.find((p) => p.id === projectId) : undefined
  }

  // Filter time entries by date range and customer
  const filteredEntries = useMemo(() => {
    return timeEntries.filter((entry) => {
      const entryDate = parseISO(entry.date)
      const isInDateRange = isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to })
      
      if (!isInDateRange) return false
      
      if (selectedCustomer === "all") return true
      
      const project = getProject(entry.workItemId)
      return project?.customerId === selectedCustomer
    })
  }, [timeEntries, workItems, projects, dateRange, selectedCustomer])

  // Calculate metrics
  const totalHours = filteredEntries.reduce((sum, e) => sum + (e.time || 0), 0)
  const approvedHours = filteredEntries.reduce((sum, e) => sum + (e.approvedTime || 0), 0)
  const approvalRate = totalHours > 0 ? (approvedHours / totalHours) * 100 : 0

  // Calculate revenue (using project rates)
  const totalRevenue = filteredEntries.reduce((sum, entry) => {
    const project = getProject(entry.workItemId)
    if (!project || project.paymentType !== "Time & material") return sum
    
    // Use employee level snapshot to determine rate
    let rate = project.midRate || 70
    if (entry.employeeLevelSnapshot === "Junior") {
      rate = project.juniorRate || 50
    } else if (entry.employeeLevelSnapshot === "Senior") {
      rate = project.seniorRate || 90
    }
    
    return sum + ((entry.approvedTime || 0) * rate)
  }, 0)

  // Hours by customer
  const hoursByCustomer = useMemo(() => {
    const customerHours: Record<string, { name: string; hours: number; approved: number }> = {}
    
    filteredEntries.forEach((entry) => {
      const project = getProject(entry.workItemId)
      const customer = customers.find((c) => c.id === project?.customerId)
      
      if (!customer) return
      
      if (!customerHours[customer.id]) {
        customerHours[customer.id] = { name: customer.companyName, hours: 0, approved: 0 }
      }
      
      customerHours[customer.id].hours += (entry.time || 0)
      customerHours[customer.id].approved += (entry.approvedTime || 0)
    })
    
    return Object.values(customerHours).sort((a, b) => b.hours - a.hours)
  }, [filteredEntries, workItems, projects, customers])

  // Hours by project
  const hoursByProject = useMemo(() => {
    const projectHours: Record<string, { name: string; hours: number; paymentType: string }> = {}
    
    filteredEntries.forEach((entry) => {
      const project = getProject(entry.workItemId)
      
      if (!project) return
      
      if (!projectHours[project.id]) {
        projectHours[project.id] = { 
          name: project.name, 
          hours: 0, 
          paymentType: project.paymentType
        }
      }
      
      projectHours[project.id].hours += (entry.time || 0)
    })
    
    return Object.values(projectHours).sort((a, b) => b.hours - a.hours)
  }, [filteredEntries, workItems, projects])

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const monthData: Record<string, { month: string; hours: number; approved: number }> = {}
    
    filteredEntries.forEach((entry) => {
      const month = format(parseISO(entry.date), "MMM yyyy")
      
      if (!monthData[month]) {
        monthData[month] = { month, hours: 0, approved: 0 }
      }
      
      monthData[month].hours += (entry.time || 0)
      monthData[month].approved += (entry.approvedTime || 0)
    })
    
    return Object.values(monthData)
  }, [filteredEntries])

  // Pie chart colors
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

  const handleExport = () => {
    // Generate CSV data
    const headers = ["Date", "Customer", "Project", "Work Item", "Hours", "Approved Hours", "Description"]
    const rows = filteredEntries.map((entry) => {
      const workItem = workItems.find((w) => w.id === entry.workItemId)
      const project = workItem ? projects.find((p) => p.id === workItem.projectId) : undefined
      const customer = project ? customers.find((c) => c.id === project.customerId) : undefined
      return [
        entry.date,
        customer?.companyName || "Unknown",
        project?.name || "Unknown",
        workItem?.title || "Unknown",
        (entry.time || 0).toString(),
        (entry.approvedTime || 0).toString(),
        entry.description || "",
      ]
    })
    
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `worklog-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              {totalHours.toFixed(1)}h tracked, {totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} revenue
            </p>
          </div>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-sm p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.filter(c => c.active).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[280px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to })
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {filteredEntries.length} time entries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {approvalRate.toFixed(1)}% approval rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Based on project rates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Hourly Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${approvedHours > 0 ? (totalRevenue / approvedHours).toFixed(0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per approved hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Tables */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-customer">By Customer</TabsTrigger>
          <TabsTrigger value="by-project">By Project</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Hours Trend</CardTitle>
                <CardDescription>Total and approved hours by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))" 
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="hours" name="Total Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Approved Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hours Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Hours by Customer</CardTitle>
                <CardDescription>Distribution of time across customers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={hoursByCustomer.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="hours"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {hoursByCustomer.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))" 
                      }}
                      formatter={(value) => `${Number(value ?? 0).toFixed(1)}h`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-customer">
          <Card>
            <CardHeader>
              <CardTitle>Hours by Customer</CardTitle>
              <CardDescription>Breakdown of hours logged for each customer</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Approved Hours</TableHead>
                    <TableHead className="text-right">Approval %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByCustomer.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No data for selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hoursByCustomer.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{row.approved.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">
                          {row.hours > 0 ? ((row.approved / row.hours) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-project">
          <Card>
            <CardHeader>
              <CardTitle>Hours by Project</CardTitle>
              <CardDescription>Breakdown of hours logged for each project</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead className="text-right">Hours Logged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByProject.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No data for selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hoursByProject.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{row.paymentType}</TableCell>
                        <TableCell className="text-right">{row.hours.toFixed(1)}h</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Time Entry Details</CardTitle>
              <CardDescription>All time entries for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Work Item</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No time entries for selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.slice(0, 100).map((entry) => {
                      const workItem = workItems.find((w) => w.id === entry.workItemId)
                      const project = workItem ? projects.find((p) => p.id === workItem.projectId) : undefined
                      const customer = project ? customers.find((c) => c.id === project.customerId) : undefined
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(parseISO(entry.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{customer?.companyName || "Unknown"}</TableCell>
                          <TableCell>{project?.name || "Unknown"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {workItem?.title || "-"}
                          </TableCell>
                          <TableCell className="text-right">{(entry.time || 0).toFixed(1)}h</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-medium",
                              (entry.approvedTime || 0) > 0 ? "text-emerald-600" : "text-zinc-400"
                            )}>
                              {(entry.approvedTime || 0).toFixed(1)}h
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              {filteredEntries.length > 100 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Showing first 100 of {filteredEntries.length} entries
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
