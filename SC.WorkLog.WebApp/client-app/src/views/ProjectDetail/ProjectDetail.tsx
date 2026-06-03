import { useParams, useHistory } from "react-router-dom"
import { useMemo, useState } from "react"
import { useWorkLog } from "lib/worklog-context"
import { Button } from "components/ui/button"
import { Badge } from "components/ui/badge"
import { Progress } from "components/ui/progress"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import { Textarea } from "components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { StatusBadge, PriorityBadge, PaymentTypeBadge } from "components/status-badges"
import { cn } from "lib/utils"
import {
  ArrowLeft,
  Clock,
  Users,
  FolderOpen,
  Plus,
  AlertTriangle,
  DollarSign,
  CreditCard,
  CalendarRange,
  Milestone,
  BarChart3,
  Edit2,
  Trash2,
} from "lucide-react"
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, isBefore, isAfter } from "date-fns"
import { toast } from "sonner"
import type { ProjectContractPeriod } from "lib/mock-data"

// Helper functions
const formatCurrency = (amount: number) => {
  return amount.toLocaleString("en-US", { style: "currency", currency: "EUR" })
}

const formatPercent = (value: number) => {
  return `${Math.round(value * 100)}%`
}

type ProjectEconomics = {
  approvedHours: number
  balance: number
  balanceStatus: "credit" | "over" | "balanced"
  budgetConsumption: number
  currentPeriod: ProjectContractPeriod
  effectiveHourlyAverage: number
  fixedAmount: number
  hasActivePeriod: boolean
  internalValue: number
  isOverBudget: boolean
  isOverRetainer: boolean
  periodApprovedHours: number
  periodBalance: number
  periodConsumption: number
  periodInternalValue: number
  remainingMargin: number
  totalPayments: number
  workedValue: number
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const { 
    projects, 
    customers, 
    workItems, 
    timeEntries, 
    employees, 
    role,
    projectPayments,
    projectContractPeriods,
  } = useWorkLog()

  const [activeTab, setActiveTab] = useState("overview")
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [addPeriodOpen, setAddPeriodOpen] = useState(false)
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)

  const isAdmin = role === "Admin"

  // Core data
  const project = useMemo(() => {
    return projects.find((p) => p.id === id)
  }, [projects, id])

  const customer = useMemo(() => {
    if (!project) return null
    return customers.find((c) => c.id === project.customerId)
  }, [project, customers])

  const projectWorkItems = useMemo(() => {
    if (!project) return []
    return workItems.filter((wi) => wi.projectId === project.id)
  }, [project, workItems])

  const projectTimeEntries = useMemo(() => {
    if (!project) return []
    const workItemIds = projectWorkItems.map((wi) => wi.id)
    return timeEntries.filter((te) => workItemIds.includes(te.workItemId))
  }, [project, projectWorkItems, timeEntries])

  const payments = useMemo(() => {
    if (!project) return []
    return projectPayments.filter((p) => p.projectId === project.id).sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    )
  }, [project, projectPayments])

  const contractPeriods = useMemo(() => {
    if (!project) return []
    return projectContractPeriods.filter((cp) => cp.projectId === project.id).sort((a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }, [project, projectContractPeriods])

  // Hours calculations
  const totalHours = useMemo(() => {
    return projectTimeEntries.reduce((sum, te) => sum + te.time, 0)
  }, [projectTimeEntries])

  const approvedHours = useMemo(() => {
    return projectTimeEntries.reduce((sum, te) => sum + te.approvedTime, 0)
  }, [projectTimeEntries])

  // Economic calculations
  const economics = useMemo(() => {
    if (!project) return null

    const workedValue = projectTimeEntries.reduce((sum, te) => 
      sum + te.approvedTime * te.projectRateSnapshot, 0
    )
    
    const internalValue = projectTimeEntries.reduce((sum, te) => 
      sum + te.approvedTime * te.defaultRateSnapshot, 0
    )

    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

    // Time & material
    if (project.paymentType === "Time & material") {
      const balance = totalPayments - workedValue
      return {
        workedValue,
        internalValue,
        totalPayments,
        balance,
        balanceStatus: balance > 0 ? "credit" : balance < 0 ? "over" : "balanced",
      }
    }

    // Fixed price
    if (project.paymentType === "Fixed price") {
      const fixedAmount = project.fixedAmount || 0
      const budgetConsumption = fixedAmount > 0 ? internalValue / fixedAmount : 0
      const effectiveHourlyAverage = approvedHours > 0 ? fixedAmount / approvedHours : 0
      const remainingMargin = fixedAmount - internalValue
      return {
        fixedAmount,
        internalValue,
        budgetConsumption,
        effectiveHourlyAverage,
        remainingMargin,
        isOverBudget: internalValue > fixedAmount,
      }
    }

    // Annual retainer
    if (project.paymentType === "Annual retainer") {
      const today = new Date()
      const currentPeriod = contractPeriods.find(cp => {
        const start = parseISO(cp.startDate)
        const end = parseISO(cp.endDate)
        return isWithinInterval(today, { start, end })
      })

      if (currentPeriod) {
        const periodEntries = projectTimeEntries.filter(te => {
          const entryDate = parseISO(te.date)
          return isWithinInterval(entryDate, { 
            start: parseISO(currentPeriod.startDate), 
            end: parseISO(currentPeriod.endDate) 
          })
        })
        const periodInternalValue = periodEntries.reduce((sum, te) => 
          sum + te.approvedTime * te.defaultRateSnapshot, 0
        )
        const periodApprovedHours = periodEntries.reduce((sum, te) => sum + te.approvedTime, 0)
        const periodBalance = currentPeriod.amount - periodInternalValue
        const periodConsumption = currentPeriod.amount > 0 ? periodInternalValue / currentPeriod.amount : 0

        return {
          currentPeriod,
          periodInternalValue,
          periodApprovedHours,
          periodBalance,
          periodConsumption,
          hasActivePeriod: true,
          isOverRetainer: periodInternalValue > currentPeriod.amount,
        }
      }

      return {
        hasActivePeriod: false,
        internalValue,
      }
    }

    // Internal
    return {
      internalValue,
      approvedHours,
    }
  }, [project, projectTimeEntries, payments, contractPeriods, approvedHours]) as ProjectEconomics | null

  // Team members
  const teamMembers = useMemo(() => {
    const memberIds = [...new Set(projectTimeEntries.map((te) => te.employeeId))]
    return employees.filter((e) => memberIds.includes(e.id))
  }, [projectTimeEntries, employees])

  // Work item stats
  const workItemStats = useMemo(() => {
    const open = projectWorkItems.filter((wi) => wi.status === "Open").length
    const inProgress = projectWorkItems.filter((wi) => wi.status === "In progress").length
    const onHold = projectWorkItems.filter((wi) => wi.status === "On hold").length
    const completed = projectWorkItems.filter((wi) => wi.status === "Completed").length
    const closed = projectWorkItems.filter((wi) => wi.status === "Closed").length
    const unassigned = projectWorkItems.filter((wi) => !wi.assigneeId).length
    return { open, inProgress, onHold, completed, closed, unassigned, total: projectWorkItems.length }
  }, [projectWorkItems])

  // Monthly data for economics
  const monthlyData = useMemo(() => {
    if (!project || projectTimeEntries.length === 0) return []

    const dates = projectTimeEntries.map(te => parseISO(te.date))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    
    const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: endOfMonth(maxDate) })
    
    let cumulativeWorkedValue = 0
    let cumulativeInternalValue = 0
    let cumulativePayments = 0

    return months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      
      const monthEntries = projectTimeEntries.filter(te => {
        const entryDate = parseISO(te.date)
        return isWithinInterval(entryDate, { start: monthStart, end: monthEnd })
      })
      
      const monthApprovedHours = monthEntries.reduce((sum, te) => sum + te.approvedTime, 0)
      const monthWorkedValue = monthEntries.reduce((sum, te) => sum + te.approvedTime * te.projectRateSnapshot, 0)
      const monthInternalValue = monthEntries.reduce((sum, te) => sum + te.approvedTime * te.defaultRateSnapshot, 0)
      
      const monthPayments = payments
        .filter(p => {
          const payDate = parseISO(p.paymentDate)
          return isWithinInterval(payDate, { start: monthStart, end: monthEnd })
        })
        .reduce((sum, p) => sum + p.amount, 0)

      cumulativeWorkedValue += monthWorkedValue
      cumulativeInternalValue += monthInternalValue
      cumulativePayments += monthPayments

      return {
        month: format(month, "MMM yyyy"),
        approvedHours: monthApprovedHours,
        workedValue: monthWorkedValue,
        internalValue: monthInternalValue,
        paymentsReceived: monthPayments,
        monthlyBalance: monthPayments - monthWorkedValue,
        cumulativeBalance: cumulativePayments - cumulativeWorkedValue,
        cumulativeInternalValue,
      }
    })
  }, [project, projectTimeEntries, payments])

  // Warnings
  const warnings = useMemo(() => {
    const list: { type: "error" | "warning" | "info"; message: string }[] = []
    
    if (workItemStats.unassigned > 0) {
      list.push({ type: "warning", message: `${workItemStats.unassigned} unassigned work item${workItemStats.unassigned > 1 ? 's' : ''}` })
    }

    if (project?.paymentType === "Time & material" && economics?.balanceStatus === "over") {
      list.push({ type: "error", message: "Project is over credit" })
    }

    if (project?.paymentType === "Fixed price" && economics?.isOverBudget) {
      list.push({ type: "error", message: "Project is over budget" })
    }

    if (project?.paymentType === "Annual retainer" && !economics?.hasActivePeriod) {
      list.push({ type: "warning", message: "No active contract period for today" })
    }

    if (project?.paymentType === "Annual retainer" && economics?.isOverRetainer) {
      list.push({ type: "error", message: "Current period is over retainer" })
    }

    return list
  }, [workItemStats, project, economics])

  // Not found
  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Project not found</h2>
          <p className="text-muted-foreground mt-2">The requested project does not exist.</p>
          <Button onClick={() => history.push("/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
      case "Suspended":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Suspended</Badge>
      case "Closed":
        return <Badge variant="secondary">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => history.push("/projects")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getStatusBadge(project.status)}
              <PaymentTypeBadge type={project.paymentType} />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">{project.name}</h1>
            <p className="text-muted-foreground">{customer?.companyName}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info("Edit project coming soon")}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {project.paymentType === "Time & material" && (
              <Button size="sm" onClick={() => setAddPaymentOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            )}
            {project.paymentType === "Annual retainer" && (
              <Button size="sm" onClick={() => setAddPeriodOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Period
              </Button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {warnings.map((warning, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                  warning.type === "error" && "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
                  warning.type === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
                  warning.type === "info" && "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                {warning.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Hours Card */}
        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs uppercase">Hours</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{totalHours}h</p>
            {isAdmin && <p className="text-xs text-muted-foreground">{approvedHours}h approved</p>}
          </CardContent>
        </Card>

        {/* Work Items Card */}
        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FolderOpen className="h-4 w-4" />
              <span className="text-xs uppercase">Work Items</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{workItemStats.total}</p>
            <p className="text-xs text-muted-foreground">{workItemStats.open + workItemStats.inProgress} active</p>
          </CardContent>
        </Card>

        {/* Economic KPI - varies by payment type */}
        {isAdmin && project.paymentType === "Time & material" && economics && (
          <Card className={cn("py-3", economics.balanceStatus === "over" && "border-red-200 dark:border-red-900")}>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs uppercase">Balance</span>
              </div>
              <p className={cn(
                "text-xl md:text-2xl font-semibold",
                economics.balance > 0 && "text-green-600",
                economics.balance < 0 && "text-red-600"
              )}>
                {formatCurrency(economics.balance)}
              </p>
              <p className="text-xs text-muted-foreground">
                {economics.balanceStatus === "credit" ? "Credit available" : 
                 economics.balanceStatus === "over" ? "Over credit" : "Balanced"}
              </p>
            </CardContent>
          </Card>
        )}

        {isAdmin && project.paymentType === "Fixed price" && economics && (
          <Card className={cn("py-3", economics.isOverBudget && "border-red-200 dark:border-red-900")}>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs uppercase">Budget</span>
              </div>
              <p className={cn(
                "text-xl md:text-2xl font-semibold",
                economics.isOverBudget && "text-red-600"
              )}>
                {formatPercent(economics.budgetConsumption)}
              </p>
              <Progress 
                value={Math.min(economics.budgetConsumption * 100, 100)} 
                className={cn("h-1.5 mt-2", economics.isOverBudget && "[&>div]:bg-red-500")} 
              />
            </CardContent>
          </Card>
        )}

        {isAdmin && project.paymentType === "Annual retainer" && economics && (
          <Card className={cn("py-3", economics.isOverRetainer && "border-red-200 dark:border-red-900")}>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CalendarRange className="h-4 w-4" />
                <span className="text-xs uppercase">
                  {economics.hasActivePeriod ? "Period Balance" : "No Active Period"}
                </span>
              </div>
              {economics.hasActivePeriod ? (
                <>
                  <p className={cn(
                    "text-xl md:text-2xl font-semibold",
                    economics.periodBalance > 0 && "text-green-600",
                    economics.periodBalance < 0 && "text-red-600"
                  )}>
                    {formatCurrency(economics.periodBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(economics.periodConsumption)} used
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-600">Configure a period</p>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && project.paymentType === "Internal" && economics && (
          <Card className="py-3">
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs uppercase">Internal Value</span>
              </div>
              <p className="text-xl md:text-2xl font-semibold">
                {formatCurrency(economics.internalValue)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Team Card */}
        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs uppercase">Team</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{teamMembers.length}</p>
            <p className="text-xs text-muted-foreground">people involved</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workitems">Work Items</TabsTrigger>
            <TabsTrigger value="timeentries">Time Entries</TabsTrigger>
            {isAdmin && <TabsTrigger value="economics">Economics</TabsTrigger>}
            {isAdmin && project.paymentType === "Time & material" && (
              <TabsTrigger value="payments">Payments</TabsTrigger>
            )}
            {isAdmin && project.paymentType === "Annual retainer" && (
              <TabsTrigger value="periods">Contract Periods</TabsTrigger>
            )}
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Project Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{customer?.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span>{customer?.contactPerson}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-primary">{customer?.contactEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Type</span>
                  <PaymentTypeBadge type={project.paymentType} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(project.status)}
                </div>
                {project.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p>{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hours Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hours Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Logged Hours</span>
                  <span className="font-mono">{totalHours}h</span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved Hours</span>
                    <span className="font-mono">{approvedHours}h</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">People Involved</span>
                  <span>{teamMembers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span>
                    {projectTimeEntries.length > 0
                      ? format(parseISO(projectTimeEntries.sort((a, b) => 
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                        )[0].date), "MMM d, yyyy")
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Work Item Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Work Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{workItemStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open</span>
                  <span>{workItemStats.open}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress</span>
                  <span>{workItemStats.inProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On Hold</span>
                  <span>{workItemStats.onHold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{workItemStats.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed</span>
                  <span>{workItemStats.closed}</span>
                </div>
                {workItemStats.unassigned > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Unassigned</span>
                    <span>{workItemStats.unassigned}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Economic Summary - Admin only */}
          {isAdmin && economics && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Economic Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {project.paymentType === "Time & material" && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">Worked Value</p>
                        <p className="font-semibold">{formatCurrency(economics.workedValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Payments Received</p>
                        <p className="font-semibold">{formatCurrency(economics.totalPayments)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Current Balance</p>
                        <p className={cn("font-semibold", economics.balance > 0 ? "text-green-600" : economics.balance < 0 ? "text-red-600" : "")}>
                          {formatCurrency(economics.balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Status</p>
                        <p className="font-semibold">
                          {economics.balanceStatus === "credit" ? "Credit Available" :
                           economics.balanceStatus === "over" ? "Over Credit" : "Balanced"}
                        </p>
                      </div>
                    </>
                  )}
                  {project.paymentType === "Fixed price" && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">Fixed Amount</p>
                        <p className="font-semibold">{formatCurrency(economics.fixedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Internal Value Used</p>
                        <p className="font-semibold">{formatCurrency(economics.internalValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Budget Consumption</p>
                        <p className={cn("font-semibold", economics.isOverBudget && "text-red-600")}>
                          {formatPercent(economics.budgetConsumption)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Remaining Margin</p>
                        <p className={cn("font-semibold", economics.remainingMargin < 0 && "text-red-600")}>
                          {formatCurrency(economics.remainingMargin)}
                        </p>
                      </div>
                    </>
                  )}
                  {project.paymentType === "Annual retainer" && economics.hasActivePeriod && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">Current Period Amount</p>
                        <p className="font-semibold">{formatCurrency(economics.currentPeriod.amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Internal Value Used</p>
                        <p className="font-semibold">{formatCurrency(economics.periodInternalValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Period Balance</p>
                        <p className={cn("font-semibold", economics.periodBalance > 0 ? "text-green-600" : economics.periodBalance < 0 ? "text-red-600" : "")}>
                          {formatCurrency(economics.periodBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Consumption</p>
                        <p className="font-semibold">{formatPercent(economics.periodConsumption)}</p>
                      </div>
                    </>
                  )}
                  {project.paymentType === "Internal" && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">Internal Value</p>
                        <p className="font-semibold">{formatCurrency(economics.internalValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Approved Hours</p>
                        <p className="font-semibold">{approvedHours}h</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity & Milestones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Time Entries */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {projectTimeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No time entries yet</p>
                ) : (
                  <div className="space-y-3">
                    {projectTimeEntries
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map(te => {
                        const emp = employees.find(e => e.id === te.employeeId)
                        const wi = workItems.find(w => w.id === te.workItemId)
                        return (
                          <div key={te.id} className="flex items-center justify-between text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{wi?.title}</p>
                              <p className="text-muted-foreground text-xs">
                                {emp?.firstName} {emp?.lastName} - {format(parseISO(te.date), "MMM d")}
                              </p>
                            </div>
                            <span className="font-mono text-muted-foreground ml-2">{te.time}h</span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Milestones Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {project.milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No milestones yet</p>
                ) : (
                  <div className="space-y-3">
                    {project.milestones
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 5)
                      .map(ms => (
                        <div key={ms.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Milestone className="h-4 w-4 text-muted-foreground" />
                            <span>{ms.title}</span>
                          </div>
                          <span className="text-muted-foreground">{format(parseISO(ms.date), "MMM d, yyyy")}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Work Items Tab */}
        <TabsContent value="workitems">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Work Items</CardTitle>
                <Button size="sm" onClick={() => toast.info("Create work item coming soon")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Work Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectWorkItems.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No work items yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => toast.info("Create work item coming soon")}>
                    Create First Work Item
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          {isAdmin && <TableHead className="text-right">Approved</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectWorkItems.map(wi => {
                          const hours = timeEntries.filter(te => te.workItemId === wi.id).reduce((sum, te) => sum + te.time, 0)
                          const approved = timeEntries.filter(te => te.workItemId === wi.id).reduce((sum, te) => sum + te.approvedTime, 0)
                          const assignee = wi.assigneeId ? employees.find(e => e.id === wi.assigneeId) : null
                          return (
                            <TableRow
                              key={wi.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => history.push(`/work-items/${wi.id}`)}
                            >
                              <TableCell className="font-mono text-sm text-muted-foreground">{wi.code}</TableCell>
                              <TableCell className="font-medium">{wi.title}</TableCell>
                              <TableCell><StatusBadge status={wi.status} /></TableCell>
                              <TableCell><PriorityBadge priority={wi.priority} /></TableCell>
                              <TableCell>
                                {assignee ? `${assignee.firstName} ${assignee.lastName}` : 
                                  <span className="text-amber-600">Unassigned</span>}
                              </TableCell>
                              <TableCell className="text-right font-mono">{hours}h</TableCell>
                              {isAdmin && <TableCell className="text-right font-mono">{approved}h</TableCell>}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {projectWorkItems.map(wi => {
                      const hours = timeEntries.filter(te => te.workItemId === wi.id).reduce((sum, te) => sum + te.time, 0)
                      const assignee = wi.assigneeId ? employees.find(e => e.id === wi.assigneeId) : null
                      return (
                        <div
                          key={wi.id}
                          className="border rounded-md p-3 cursor-pointer hover:bg-muted/50"
                          onClick={() => history.push(`/work-items/${wi.id}`)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-xs text-muted-foreground">{wi.code}</p>
                              <p className="font-medium truncate">{wi.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {assignee ? `${assignee.firstName} ${assignee.lastName}` : 
                                  <span className="text-amber-600">Unassigned</span>}
                              </p>
                            </div>
                            <span className="font-mono text-sm">{hours}h</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge status={wi.status} />
                            <PriorityBadge priority={wi.priority} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Entries Tab */}
        <TabsContent value="timeentries">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Time Entries</CardTitle>
                <Button size="sm" onClick={() => toast.info("Add time entry coming soon")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectTimeEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No time entries yet</p>
                </div>
              ) : (
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Work Item</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                        {isAdmin && (
                          <>
                            <TableHead className="text-right">Approved</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectTimeEntries
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 50)
                        .map(te => {
                          const emp = employees.find(e => e.id === te.employeeId)
                          const wi = workItems.find(w => w.id === te.workItemId)
                          const calculatedValue = project.paymentType === "Time & material" 
                            ? te.approvedTime * te.projectRateSnapshot
                            : te.approvedTime * te.defaultRateSnapshot
                          return (
                            <TableRow key={te.id}>
                              <TableCell>{format(parseISO(te.date), "MMM d, yyyy")}</TableCell>
                              <TableCell>{emp?.firstName} {emp?.lastName}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{wi?.title}</TableCell>
                              <TableCell className="text-right font-mono">{te.time}h</TableCell>
                              {isAdmin && (
                                <>
                                  <TableCell className="text-right font-mono">{te.approvedTime}h</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{te.employeeLevelSnapshot}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatCurrency(project.paymentType === "Time & material" ? te.projectRateSnapshot : te.defaultRateSnapshot)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(calculatedValue)}</TableCell>
                                </>
                              )}
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Mobile Time Entries */}
              <div className="md:hidden space-y-3">
                {projectTimeEntries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 20)
                  .map(te => {
                    const emp = employees.find(e => e.id === te.employeeId)
                    const wi = workItems.find(w => w.id === te.workItemId)
                    return (
                      <div key={te.id} className="border rounded-md p-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{wi?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {emp?.firstName} {emp?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(te.date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <span className="font-mono">{te.time}h</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Economics Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="economics">
            <div className="space-y-4">
              {/* Summary Cards */}
              {project.paymentType === "Time & material" && economics && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Junior Rate</p>
                        <p className="text-lg font-semibold">{formatCurrency(project.juniorRate || 0)}/h</p>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Mid Rate</p>
                        <p className="text-lg font-semibold">{formatCurrency(project.midRate || 0)}/h</p>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Senior Rate</p>
                        <p className="text-lg font-semibold">{formatCurrency(project.seniorRate || 0)}/h</p>
                      </CardContent>
                    </Card>
                    <Card className={cn("py-3", economics.balanceStatus === "over" && "border-red-200")}>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                        <p className={cn(
                          "text-lg font-semibold",
                          economics.balance > 0 && "text-green-600",
                          economics.balance < 0 && "text-red-600"
                        )}>
                          {formatCurrency(economics.balance)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Balance Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Worked Value</TableHead>
                            <TableHead className="text-right">Payments</TableHead>
                            <TableHead className="text-right">Monthly</TableHead>
                            <TableHead className="text-right">Cumulative</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyData.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell>{row.month}</TableCell>
                              <TableCell className="text-right font-mono">{row.approvedHours}h</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(row.workedValue)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(row.paymentsReceived)}</TableCell>
                              <TableCell className={cn(
                                "text-right font-mono",
                                row.monthlyBalance > 0 && "text-green-600",
                                row.monthlyBalance < 0 && "text-red-600"
                              )}>
                                {formatCurrency(row.monthlyBalance)}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-mono font-semibold",
                                row.cumulativeBalance > 0 && "text-green-600",
                                row.cumulativeBalance < 0 && "text-red-600"
                              )}>
                                {formatCurrency(row.cumulativeBalance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}

              {project.paymentType === "Fixed price" && economics && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Fixed Amount</p>
                        <p className="text-lg font-semibold">{formatCurrency(economics.fixedAmount)}</p>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Internal Value Used</p>
                        <p className="text-lg font-semibold">{formatCurrency(economics.internalValue)}</p>
                      </CardContent>
                    </Card>
                    <Card className={cn("py-3", economics.isOverBudget && "border-red-200")}>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Budget Consumption</p>
                        <p className={cn("text-lg font-semibold", economics.isOverBudget && "text-red-600")}>
                          {formatPercent(economics.budgetConsumption)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Effective Hourly Avg</p>
                        <p className="text-lg font-semibold">{formatCurrency(economics.effectiveHourlyAverage)}/h</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Consumption Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Consumption</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Internal Value</TableHead>
                            <TableHead className="text-right">Cumulative</TableHead>
                            <TableHead className="text-right">Consumption</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyData.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell>{row.month}</TableCell>
                              <TableCell className="text-right font-mono">{row.approvedHours}h</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(row.internalValue)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(row.cumulativeInternalValue)}</TableCell>
                              <TableCell className={cn(
                                "text-right font-mono",
                                row.cumulativeInternalValue > economics.fixedAmount && "text-red-600"
                              )}>
                                {formatPercent(row.cumulativeInternalValue / economics.fixedAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}

              {project.paymentType === "Annual retainer" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contract Period Details</CardTitle>
                    <CardDescription>Select a contract period to view detailed economics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contractPeriods.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarRange className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No contract periods configured</p>
                        <Button variant="outline" className="mt-4" onClick={() => setAddPeriodOpen(true)}>
                          Add Contract Period
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {contractPeriods.map(cp => {
                          const periodEntries = projectTimeEntries.filter(te => {
                            const entryDate = parseISO(te.date)
                            return isWithinInterval(entryDate, { 
                              start: parseISO(cp.startDate), 
                              end: parseISO(cp.endDate) 
                            })
                          })
                          const periodInternalValue = periodEntries.reduce((sum, te) => 
                            sum + te.approvedTime * te.defaultRateSnapshot, 0
                          )
                          const periodHours = periodEntries.reduce((sum, te) => sum + te.approvedTime, 0)
                          const balance = cp.amount - periodInternalValue
                          const consumption = cp.amount > 0 ? periodInternalValue / cp.amount : 0
                          const isActive = isWithinInterval(new Date(), { 
                            start: parseISO(cp.startDate), 
                            end: parseISO(cp.endDate) 
                          })

                          return (
                            <div key={cp.id} className={cn(
                              "border rounded-lg p-4",
                              isActive && "border-primary"
                            )}>
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">
                                      {format(parseISO(cp.startDate), "MMM yyyy")} - {format(parseISO(cp.endDate), "MMM yyyy")}
                                    </h4>
                                    {isActive && <Badge>Active</Badge>}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{cp.note}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{formatCurrency(cp.amount)}</p>
                                  {cp.paymentDate && (
                                    <p className="text-xs text-muted-foreground">
                                      Paid: {format(parseISO(cp.paymentDate), "MMM d, yyyy")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">Hours</p>
                                  <p className="font-mono">{periodHours}h</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Internal Value</p>
                                  <p className="font-mono">{formatCurrency(periodInternalValue)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Balance</p>
                                  <p className={cn(
                                    "font-mono",
                                    balance > 0 && "text-green-600",
                                    balance < 0 && "text-red-600"
                                  )}>
                                    {formatCurrency(balance)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Consumption</p>
                                  <p className={cn("font-mono", consumption > 1 && "text-red-600")}>
                                    {formatPercent(consumption)}
                                  </p>
                                </div>
                              </div>
                              <Progress 
                                value={Math.min(consumption * 100, 100)} 
                                className={cn("h-1.5 mt-3", consumption > 1 && "[&>div]:bg-red-500")} 
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {project.paymentType === "Internal" && economics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="py-3">
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Approved Hours</p>
                      <p className="text-lg font-semibold">{approvedHours}h</p>
                    </CardContent>
                  </Card>
                  <Card className="py-3">
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Internal Value</p>
                      <p className="text-lg font-semibold">{formatCurrency(economics.internalValue)}</p>
                    </CardContent>
                  </Card>
                  <Card className="py-3">
                    <CardContent>
                      <p className="text-xs text-muted-foreground">People Involved</p>
                      <p className="text-lg font-semibold">{teamMembers.length}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Payments Tab - Time & Material Only */}
        {isAdmin && project.paymentType === "Time & material" && (
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Payments</CardTitle>
                    <CardDescription>Manage payments received for this project</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddPaymentOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {economics && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Total Payments</p>
                        <p className="text-lg font-semibold">{formatCurrency(economics.totalPayments)}</p>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Worked Value</p>
                        <p className="text-lg font-semibold">{formatCurrency(economics.workedValue)}</p>
                      </CardContent>
                    </Card>
                    <Card className={cn("py-3", economics.balanceStatus === "over" && "border-red-200")}>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={cn(
                          "text-lg font-semibold",
                          economics.balance > 0 && "text-green-600",
                          economics.balance < 0 && "text-red-600"
                        )}>
                          {formatCurrency(economics.balance)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No payments recorded</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(pay => {
                        const creator = employees.find(e => e.id === pay.createdBy)
                        return (
                          <TableRow key={pay.id}>
                            <TableCell>{format(parseISO(pay.paymentDate), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(pay.amount)}</TableCell>
                            <TableCell className="text-muted-foreground">{pay.note}</TableCell>
                            <TableCell>{creator?.firstName} {creator?.lastName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Contract Periods Tab - Annual Retainer Only */}
        {isAdmin && project.paymentType === "Annual retainer" && (
          <TabsContent value="periods">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Contract Periods</CardTitle>
                    <CardDescription>Manage annual retainer periods for this project</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setAddPeriodOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Period
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contractPeriods.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarRange className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No contract periods configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Used</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Consumption</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractPeriods.map(cp => {
                        const periodEntries = projectTimeEntries.filter(te => {
                          const entryDate = parseISO(te.date)
                          return isWithinInterval(entryDate, { 
                            start: parseISO(cp.startDate), 
                            end: parseISO(cp.endDate) 
                          })
                        })
                        const periodInternalValue = periodEntries.reduce((sum, te) => 
                          sum + te.approvedTime * te.defaultRateSnapshot, 0
                        )
                        const balance = cp.amount - periodInternalValue
                        const consumption = cp.amount > 0 ? periodInternalValue / cp.amount : 0
                        const isActive = isWithinInterval(new Date(), { 
                          start: parseISO(cp.startDate), 
                          end: parseISO(cp.endDate) 
                        })
                        const isPast = isBefore(parseISO(cp.endDate), new Date())
                        const isFuture = isAfter(parseISO(cp.startDate), new Date())

                        return (
                          <TableRow key={cp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {format(parseISO(cp.startDate), "MMM yyyy")} - {format(parseISO(cp.endDate), "MMM yyyy")}
                                {isActive && <Badge>Active</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(cp.amount)}</TableCell>
                            <TableCell>
                              {cp.paymentDate ? format(parseISO(cp.paymentDate), "MMM d, yyyy") : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(periodInternalValue)}</TableCell>
                            <TableCell className={cn(
                              "text-right font-mono",
                              balance > 0 && "text-green-600",
                              balance < 0 && "text-red-600"
                            )}>
                              {formatCurrency(balance)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono",
                              consumption > 1 && "text-red-600"
                            )}>
                              {formatPercent(consumption)}
                            </TableCell>
                            <TableCell>
                              {isPast && <Badge variant="secondary">Past</Badge>}
                              {isActive && balance > 0 && <Badge className="bg-green-500/10 text-green-600 border-green-200">Healthy</Badge>}
                              {isActive && balance <= 0 && <Badge variant="destructive">Over</Badge>}
                              {isFuture && <Badge variant="outline">Future</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Milestones</CardTitle>
                  <CardDescription>Track important project dates and deadlines</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAddMilestoneOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.milestones.length === 0 ? (
                <div className="text-center py-8">
                  <Milestone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No milestones yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.milestones
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(ms => (
                        <TableRow key={ms.id}>
                          <TableCell>{format(parseISO(ms.date), "MMM d, yyyy")}</TableCell>
                          <TableCell>{ms.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Settings</CardTitle>
                <CardDescription>Configure project details and economic settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 max-w-2xl">
                  <div className="grid gap-2">
                    <Label>Customer</Label>
                    <Select defaultValue={project.customerId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Project Name</Label>
                    <Input defaultValue={project.name} />
                  </div>

                  <div className="grid gap-2">
                    <Label>Payment Type</Label>
                    <Select defaultValue={project.paymentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Time & material">Time & material</SelectItem>
                        <SelectItem value="Fixed price">Fixed price</SelectItem>
                        <SelectItem value="Annual retainer">Annual retainer</SelectItem>
                        <SelectItem value="Internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-600">
                      Changing the payment type can affect project calculations and reports.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select defaultValue={project.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Textarea defaultValue={project.notes} rows={3} />
                  </div>

                  {/* Dynamic fields based on payment type */}
                  {project.paymentType === "Time & material" && (
                    <div className="border-t pt-6 space-y-4">
                      <h4 className="font-medium">Hourly Rates</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>Junior Rate</Label>
                          <Input type="number" defaultValue={project.juniorRate || 0} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Mid Rate</Label>
                          <Input type="number" defaultValue={project.midRate || 0} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Senior Rate</Label>
                          <Input type="number" defaultValue={project.seniorRate || 0} />
                        </div>
                      </div>
                    </div>
                  )}

                  {project.paymentType === "Fixed price" && (
                    <div className="border-t pt-6">
                      <div className="grid gap-2">
                        <Label>Fixed Amount</Label>
                        <Input type="number" defaultValue={project.fixedAmount || 0} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button onClick={() => toast.success("Settings saved")}>Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>Record a new payment for this project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Payment Date</Label>
              <Input type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} />
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="grid gap-2">
              <Label>Note</Label>
              <Textarea placeholder="Payment description..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPaymentOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAddPaymentOpen(false); toast.success("Payment added") }}>Add Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contract Period Dialog */}
      <Dialog open={addPeriodOpen} onOpenChange={setAddPeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contract Period</DialogTitle>
            <DialogDescription>Define a new retainer period for this project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="grid gap-2">
              <Label>Payment Date (optional)</Label>
              <Input type="date" />
            </div>
            <div className="grid gap-2">
              <Label>Note</Label>
              <Textarea placeholder="Period description..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPeriodOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAddPeriodOpen(false); toast.success("Contract period added") }}>Add Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>Add a new milestone for this project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input placeholder="Milestone description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMilestoneOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAddMilestoneOpen(false); toast.success("Milestone added") }}>Add Milestone</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
