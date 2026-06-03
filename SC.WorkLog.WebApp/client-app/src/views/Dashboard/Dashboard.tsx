import { useState } from 'react'
import { useWorkLog } from 'lib/worklog-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Tabs, TabsList, TabsTrigger } from 'components/ui/tabs'
import { StatusBadge, PriorityBadge } from 'components/status-badges'
import { Progress } from 'components/ui/progress'
import {
  Clock,
  CheckCircle,
  DollarSign,
  Building2,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react'
import { Link } from 'react-router-dom'

type Period = 'today' | 'week' | 'month'

export default function DashboardPage() {
  const {
    role,
    employees,
    customers,
    projects,
    workItems,
    timeEntries,
    leaveRequests,
    overtimeRequests,
  } = useWorkLog()

  const [period, setPeriod] = useState<Period>('today')

  // Calculate date range based on period
  const today = new Date()
  const getDateRange = () => {
    const start = new Date(today)
    const end = new Date(today)

    if (period === 'week') {
      start.setDate(today.getDate() - today.getDay())
      end.setDate(start.getDate() + 6)
    } else if (period === 'month') {
      start.setDate(1)
      end.setMonth(today.getMonth() + 1, 0)
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  const { start, end } = getDateRange()

  // Filter time entries by period
  const periodEntries = timeEntries.filter((e) => e.date >= start && e.date <= end)

  // Calculate KPIs
  const totalLoggedHours = periodEntries.reduce((sum, e) => sum + e.time, 0)
  const totalApprovedHours = periodEntries.reduce((sum, e) => sum + e.approvedTime, 0)

  // Calculate billable value (T&M projects only)
  const billableValue = periodEntries.reduce((sum, entry) => {
    const workItem = workItems.find((w) => w.id === entry.workItemId)
    const project = workItem ? projects.find((p) => p.id === workItem.projectId) : null
    if (project?.paymentType === 'Time & material') {
      return sum + entry.approvedTime * entry.projectRateSnapshot
    }
    return sum
  }, 0)

  // Calculate internal value (all projects)
  const internalValue = periodEntries.reduce((sum, entry) => {
    return sum + entry.approvedTime * entry.defaultRateSnapshot
  }, 0)

  // Pending approvals
  const pendingLeave = leaveRequests.filter((l) => l.status === 'Pending approval')
  const pendingOvertime = overtimeRequests.filter((o) => o.status === 'Pending approval')

  // Employees with missing hours (today only)
  const todayStr = today.toISOString().split('T')[0]
  const employeesWithMissingHours = employees
    .filter((emp) => emp.active)
    .map((emp) => {
      const dayHours = timeEntries
        .filter((e) => e.employeeId === emp.id && e.date === todayStr)
        .reduce((sum, e) => sum + e.time, 0)
      const leave = leaveRequests.find(
        (l) => l.employeeId === emp.id && l.date === todayStr && l.status === 'Approved'
      )
      const leaveHours = leave?.hours || 0
      const missing = emp.expectedDailyHours - dayHours - leaveHours
      return { employee: emp, dayHours, missing: Math.max(0, missing) }
    })
    .filter((e) => e.missing > 0)

  // Unassigned work items
  const unassignedWorkItems = workItems.filter(
    (w) => !w.assigneeId && w.status !== 'Closed' && w.status !== 'Completed'
  )

  // Hours by customer
  const hoursByCustomer = customers.map((customer) => {
    const customerProjects = projects.filter((p) => p.customerId === customer.id)
    const customerWorkItems = workItems.filter((w) =>
      customerProjects.some((p) => p.id === w.projectId)
    )
    const customerEntries = periodEntries.filter((e) =>
      customerWorkItems.some((w) => w.id === e.workItemId)
    )
    const hours = customerEntries.reduce((sum, e) => sum + e.approvedTime, 0)
    const value = customerEntries.reduce((sum, e) => sum + e.approvedTime * e.projectRateSnapshot, 0)
    return { customer, hours, value }
  }).filter((c) => c.hours > 0)

  // Hours by employee
  const hoursByEmployee = employees
    .filter((e) => e.active)
    .map((employee) => {
      const empEntries = periodEntries.filter((e) => e.employeeId === employee.id)
      const hours = empEntries.reduce((sum, e) => sum + e.time, 0)
      return { employee, hours }
    })
    .filter((e) => e.hours > 0)

  // Fixed price project consumption
  const fixedPriceProjects = projects
    .filter((p) => p.paymentType === 'Fixed price' && p.status === 'Active')
    .map((project) => {
      const projectWorkItems = workItems.filter((w) => w.projectId === project.id)
      const projectEntries = timeEntries.filter((e) =>
        projectWorkItems.some((w) => w.id === e.workItemId)
      )
      const internalCost = projectEntries.reduce(
        (sum, e) => sum + e.approvedTime * e.defaultRateSnapshot,
        0
      )
      const totalHours = projectEntries.reduce((sum, e) => sum + e.approvedTime, 0)
      const consumption = project.fixedAmount ? (internalCost / project.fixedAmount) * 100 : 0
      const avgRate = totalHours > 0 ? internalCost / totalHours : 0
      const customer = customers.find((c) => c.id === project.customerId)
      return { project, customer, internalCost, totalHours, consumption, avgRate }
    })

  // Retainer consumption
  const retainerProjects = projects
    .filter((p) => p.paymentType === 'Annual retainer' && p.status === 'Active')
    .map((project) => {
      const projectWorkItems = workItems.filter((w) => w.projectId === project.id)
      const projectEntries = timeEntries.filter((e) =>
        projectWorkItems.some((w) => w.id === e.workItemId)
      )
      const internalCost = projectEntries.reduce(
        (sum, e) => sum + e.approvedTime * e.defaultRateSnapshot,
        0
      )
      const consumption = project.annualAmount ? (internalCost / project.annualAmount) * 100 : 0
      const customer = customers.find((c) => c.id === project.customerId)
      return { project, customer, internalCost, consumption }
    })

  if (role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">This page is only available for administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {employees.filter(e => e.active).length} employees, {projects.filter(p => p.status === 'Active').length} active projects
            </p>
          </div>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Logged Hours</CardDescription>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoggedHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Approved Hours</CardDescription>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApprovedHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Billable Value</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billableValue.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Internal Value</CardDescription>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {internalValue.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Pending Leave Requests</CardDescription>
            <CardTitle className="text-2xl">{pendingLeave.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/approvals">
              <Button variant="link" className="h-auto p-0 text-amber-700 dark:text-amber-400">
                Review requests <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Pending Overtime</CardDescription>
            <CardTitle className="text-2xl">{pendingOvertime.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/approvals">
              <Button variant="link" className="h-auto p-0 text-amber-700 dark:text-amber-400">
                Review overtime <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Missing Hours Today</CardDescription>
            <CardTitle className="text-2xl">{employeesWithMissingHours.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/time-completeness">
              <Button variant="link" className="h-auto p-0 text-red-700 dark:text-red-400">
                View details <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardDescription>Unassigned Work Items</CardDescription>
            <CardTitle className="text-2xl">{unassignedWorkItems.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/work-items">
              <Button variant="link" className="h-auto p-0 text-blue-700 dark:text-blue-400">
                View items <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hours by Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by Customer</CardTitle>
            <CardDescription>Approved hours and billable value</CardDescription>
          </CardHeader>
          <CardContent>
            {hoursByCustomer.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hours logged for this period
              </p>
            ) : (
              <div className="space-y-4">
                {hoursByCustomer.map(({ customer, hours, value }) => (
                  <div key={customer.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{customer.companyName}</p>
                      <p className="text-sm text-muted-foreground">{hours.toFixed(1)}h</p>
                    </div>
                    <p className="font-mono">
                      {value.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours by Employee */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by Employee</CardTitle>
            <CardDescription>Logged hours per team member</CardDescription>
          </CardHeader>
          <CardContent>
            {hoursByEmployee.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hours logged for this period
              </p>
            ) : (
              <div className="space-y-4">
                {hoursByEmployee.map(({ employee, hours }) => (
                  <div key={employee.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{employee.level}</p>
                    </div>
                    <p className="font-mono">{hours.toFixed(1)}h</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fixed Price Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Fixed Price Projects</CardTitle>
            <CardDescription>Budget consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {fixedPriceProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active fixed price projects
              </p>
            ) : (
              <div className="space-y-6">
                {fixedPriceProjects.map(
                  ({ project, customer, internalCost, totalHours, consumption, avgRate }) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{customer?.companyName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">
                            {internalCost.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'EUR',
                            })}{' '}
                            /{' '}
                            {project.fixedAmount?.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {totalHours.toFixed(1)}h @ avg{' '}
                            {avgRate.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                            /h
                          </p>
                        </div>
                      </div>
                      <Progress value={Math.min(consumption, 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        {consumption.toFixed(0)}% consumed
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retainer Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Annual Retainers</CardTitle>
            <CardDescription>Internal cost consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {retainerProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active retainer projects
              </p>
            ) : (
              <div className="space-y-6">
                {retainerProjects.map(({ project, customer, internalCost, consumption }) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{customer?.companyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">
                          {internalCost.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'EUR',
                          })}{' '}
                          /{' '}
                          {project.annualAmount?.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                      </div>
                    </div>
                    <Progress value={Math.min(consumption, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {consumption.toFixed(0)}% of annual budget
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Missing Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Missing Hours Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeesWithMissingHours.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All employees have complete hours
              </p>
            ) : (
              <div className="space-y-3">
                {employeesWithMissingHours.map(({ employee, dayHours }) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Logged {dayHours}h / {employee.expectedDailyHours}h
                      </p>
                    </div>
                    <StatusBadge status="Missing hours" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Work Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              Unassigned Work Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedWorkItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All work items are assigned
              </p>
            ) : (
              <div className="space-y-3">
                {unassignedWorkItems.slice(0, 5).map((item) => {
                  const project = projects.find((p) => p.id === item.projectId)
                  const customer = customers.find((c) => c.id === project?.customerId)
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {customer?.companyName} - {project?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>
                  )
                })}
                {unassignedWorkItems.length > 5 && (
                  <Link to="/work-items">
                    <Button variant="link" className="w-full">
                      View all {unassignedWorkItems.length} items
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
