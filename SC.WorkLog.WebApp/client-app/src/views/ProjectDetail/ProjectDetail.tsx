import { useCallback, useEffect, useMemo, useState } from "react"
import { useHistory, useParams } from "react-router-dom"
import { useAuth } from "helpers/services/AuthContext"
import {
  deleteProjectContractPeriod,
  deleteProjectMilestone,
  deleteProjectPayment,
  getProject,
  getProjectContractPeriods,
  getProjectEconomics,
  getProjectPayments,
  getWorkItems,
  type ProjectContractPeriodDto,
  type ProjectDetailDto,
  type ProjectEconomicsDto,
  type ProjectMilestoneDto,
  type ProjectPaymentDto,
  type ProjectPaymentType,
  type ProjectStatus,
  type RetainerPeriodStatus,
  type TimeAndMaterialBalanceStatus,
  type WorkItemListItemDto,
} from "helpers/services/worklog-api"
import { ProjectContractPeriodDialog } from "components/project-contract-period-dialog"
import { ProjectFormDialog } from "components/project-form-dialog"
import { ProjectMilestoneDialog } from "components/project-milestone-dialog"
import { ProjectPaymentDialog } from "components/project-payment-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"
import { Button } from "components/ui/button"
import { Badge } from "components/ui/badge"
import { PriorityBadge, StatusBadge } from "components/status-badges"
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
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import {
  ArrowLeft,
  Clock,
  Edit2,
  FileText,
  FolderOpen,
  Milestone,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "lib/utils"
import { toast } from "sonner"

const formatCurrency = (amount: number) => {
  return amount.toLocaleString("en-US", { style: "currency", currency: "EUR" })
}

const formatHours = (hours: number) => `${hours.toLocaleString("en-US", { maximumFractionDigits: 2 })}h`

const formatPercent = (value: number) =>
  `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`

const formatMonth = (value: string) => format(parseISO(value), "MMM yyyy")

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to view this project."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load project detail. Please try again."
}

const paymentTypeLabel = (paymentType: ProjectPaymentType) => {
  switch (paymentType) {
    case "TimeAndMaterial":
      return "Time & material"
    case "FixedPrice":
      return "Fixed price"
    case "AnnualRetainer":
      return "Annual retainer"
    case "Internal":
      return "Internal"
    default:
      return paymentType
  }
}

const getPaymentBadgeClass = (paymentType: ProjectPaymentType) => {
  switch (paymentType) {
    case "TimeAndMaterial":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "FixedPrice":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
    case "AnnualRetainer":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    case "Internal":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

const getStatusBadge = (status: ProjectStatus) => {
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

const originLabel = (origin: WorkItemListItemDto["origin"]) => {
  switch (origin) {
    case "AzureDevOps":
      return "Azure DevOps"
    default:
      return origin
  }
}

const statusDisplayName = (workItem: WorkItemListItemDto) =>
  workItem.statusName || workItem.customerDisplayName || workItem.statusKey

const getBalanceBadge = (status: TimeAndMaterialBalanceStatus) => {
  switch (status) {
    case "CreditAvailable":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Credit available</Badge>
    case "Balanced":
      return <Badge variant="secondary">Balanced</Badge>
    case "OverCredit":
      return <Badge className="bg-red-500/10 text-red-600 border-red-200">Over credit</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getRetainerStatusBadge = (status: RetainerPeriodStatus) => {
  switch (status) {
    case "Healthy":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Healthy</Badge>
    case "Balanced":
      return <Badge variant="secondary">Balanced</Badge>
    case "OverRetainer":
      return <Badge className="bg-red-500/10 text-red-600 border-red-200">Over retainer</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

type DeleteTarget =
  | { type: "payment"; id: string; label: string }
  | { type: "contractPeriod"; id: string; label: string }
  | { type: "milestone"; id: string; label: string }

function PendingIntegration({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      </CardContent>
    </Card>
  )
}

function EmptyEconomicsState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-medium">{message}</h3>
      </CardContent>
    </Card>
  )
}

function EconomicsMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Card className="py-3">
      <CardContent>
        <p className="text-xs uppercase text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
        {helper && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}
      </CardContent>
    </Card>
  )
}

function TimeAndMaterialEconomics({ economics }: { economics: ProjectEconomicsDto }) {
  const value = economics.timeAndMaterial
  if (!value) return <EmptyEconomicsState message="No Time & material economics returned." />
  const monthlyRows = value.monthlyRows ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <EconomicsMetric label="Approved hours" value={formatHours(value.approvedHours)} />
        <EconomicsMetric label="Worked value" value={formatCurrency(value.workedValue)} />
        <EconomicsMetric label="Payments received" value={formatCurrency(value.totalPaymentsReceived)} />
        <Card className="py-3">
          <CardContent>
            <p className="text-xs uppercase text-muted-foreground mb-1">Current balance</p>
            <p className="text-xl font-semibold">{formatCurrency(value.currentBalance)}</p>
            <div className="mt-2">{getBalanceBadge(value.balanceStatus)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Balance</CardTitle>
          <CardDescription>Backend-calculated approved value and payments by month.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No approved time or payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Worked value</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Monthly balance</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRows.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{formatMonth(row.month)}</TableCell>
                    <TableCell className="text-right font-mono">{formatHours(row.approvedHours)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.workedValue)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.paymentsReceived)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.monthlyBalance)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.cumulativeBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FixedPriceEconomics({ economics }: { economics: ProjectEconomicsDto }) {
  const value = economics.fixedPrice
  if (!value) return <EmptyEconomicsState message="No Fixed price economics returned." />

  return (
    <div className="space-y-4">
      {value.overBudget && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Project is over budget</AlertTitle>
          <AlertDescription>Backend economics report internal value above the fixed amount.</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <EconomicsMetric label="Fixed amount" value={formatCurrency(value.fixedAmount)} />
        <EconomicsMetric label="Approved hours" value={formatHours(value.approvedHours)} />
        <EconomicsMetric label="Internal value used" value={formatCurrency(value.internalValueUsed)} />
        <EconomicsMetric label="Budget consumption" value={formatPercent(value.budgetConsumptionPercentage)} />
        <EconomicsMetric label="Effective hourly average" value={`${formatCurrency(value.effectiveHourlyAverage)}/h`} />
        <EconomicsMetric
          label="Remaining margin"
          value={formatCurrency(value.remainingTheoreticalMargin)}
          helper={value.overBudget ? "Negative margin" : "Theoretical remaining value"}
        />
      </div>
    </div>
  )
}

function AnnualRetainerEconomics({ economics }: { economics: ProjectEconomicsDto }) {
  const periods = economics.annualRetainerPeriods ?? []
  if (periods.length === 0) return <EmptyEconomicsState message="No contract period configured yet." />

  const selectedPeriod = economics.annualRetainer ?? periods[0]
  const today = new Date()
  const hasActivePeriod = periods.some((period) => today >= new Date(period.startDate) && today <= new Date(period.endDate))
  const monthlyRows = selectedPeriod.monthlyRows ?? []

  return (
    <div className="space-y-4">
      {!hasActivePeriod && (
        <Alert>
          <AlertTitle>No active retainer period today</AlertTitle>
          <AlertDescription>Showing the first configured contract period returned by the backend.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <EconomicsMetric label="Period amount" value={formatCurrency(selectedPeriod.amount)} />
        <EconomicsMetric label="Approved hours" value={formatHours(selectedPeriod.approvedHours)} />
        <EconomicsMetric label="Internal value used" value={formatCurrency(selectedPeriod.internalValueUsed)} />
        <Card className="py-3">
          <CardContent>
            <p className="text-xs uppercase text-muted-foreground mb-1">Balance</p>
            <p className="text-xl font-semibold">{formatCurrency(selectedPeriod.balance)}</p>
            <div className="mt-2">{getRetainerStatusBadge(selectedPeriod.status)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract Periods</CardTitle>
            <CardDescription>Read-only retainer periods and consumption returned by the backend.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Consumption</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.contractPeriodId}>
                    <TableCell>{format(parseISO(period.startDate), "MMM d, yyyy")} - {format(parseISO(period.endDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(period.amount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(period.consumptionPercentage)}</TableCell>
                    <TableCell>{getRetainerStatusBadge(period.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Period Monthly Rows</CardTitle>
            <CardDescription>Backend-calculated monthly internal value for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No monthly rows for this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Internal</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRows.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{formatMonth(row.month)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.internalValue)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.expectedCumulativeValue)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.delta)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InternalEconomics({ economics, project }: { economics: ProjectEconomicsDto; project: ProjectDetailDto }) {
  const value = economics.internal
  if (!value) return <EmptyEconomicsState message="No Internal project economics returned." />

  const employeesById = new Map(project.teamSummary.map((member) => [member.employeeId, member.fullName ?? member.employeeId]))
  const employeeRows = value.internalValueByEmployee ?? []
  const monthlyRows = value.monthlyInternalValue ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <EconomicsMetric label="Approved hours" value={formatHours(value.approvedHours)} />
        <EconomicsMetric label="Internal value" value={formatCurrency(value.internalValue)} />
        <EconomicsMetric label="People involved" value={employeeRows.length.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Value By Employee</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No approved internal time yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Internal value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeRows.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell>{employeesById.get(row.employeeId) ?? row.employeeId}</TableCell>
                      <TableCell className="text-right font-mono">{formatHours(row.approvedHours)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.internalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Internal Value</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No monthly internal value yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Internal value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRows.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{formatMonth(row.month)}</TableCell>
                      <TableCell className="text-right font-mono">{formatHours(row.approvedHours)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(row.internalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProjectEconomicsContent({ economics, project }: { economics: ProjectEconomicsDto; project: ProjectDetailDto }) {
  switch (project.paymentType) {
    case "TimeAndMaterial":
      return <TimeAndMaterialEconomics economics={economics} />
    case "FixedPrice":
      return <FixedPriceEconomics economics={economics} />
    case "AnnualRetainer":
      return <AnnualRetainerEconomics economics={economics} />
    case "Internal":
      return <InternalEconomics economics={economics} project={project} />
    default:
      return <EmptyEconomicsState message="Unsupported project payment type." />
  }
}

function ProjectPaymentsContent({
  payments,
  isLoading,
  error,
  onAdd,
  onDelete,
  onEdit,
}: {
  payments: ProjectPaymentDto[]
  isLoading: boolean
  error: string | null
  onAdd: () => void
  onDelete: (payment: ProjectPaymentDto) => void
  onEdit: (payment: ProjectPaymentDto) => void
}) {
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Payments</CardTitle>
            <CardDescription>Admin-only payments loaded from Project/GetProjectPayments.</CardDescription>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to load payments</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <EconomicsMetric label="Payments count" value={payments.length.toString()} />
          <EconomicsMetric label="Total received" value={formatCurrency(totalPayments)} />
          <EconomicsMetric label="Latest payment" value={payments.length === 0 ? "-" : format(parseISO(payments[payments.length - 1].paymentDate), "MMM d, yyyy")} />
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{error ? "Payments are unavailable." : "No payments yet"}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(parseISO(payment.paymentDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-muted-foreground">{payment.note || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(payment.createdOn), "MMM d, yyyy")}
                        {payment.createdBy && <span className="block text-xs">{payment.createdBy}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Edit payment" onClick={() => onEdit(payment)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete payment" onClick={() => onDelete(payment)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {payments.map((payment) => (
                <Card key={payment.id} className="py-3">
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{format(parseISO(payment.paymentDate), "MMM d, yyyy")}</p>
                        <p className="text-sm text-muted-foreground">{payment.note || "No note"}</p>
                        {payment.createdBy && <p className="text-xs text-muted-foreground mt-1">Created by {payment.createdBy}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{formatCurrency(payment.amount)}</p>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => onEdit(payment)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => onDelete(payment)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ProjectContractPeriodsContent({
  periods,
  isLoading,
  error,
  onAdd,
  onDelete,
  onEdit,
}: {
  periods: ProjectContractPeriodDto[]
  isLoading: boolean
  error: string | null
  onAdd: () => void
  onDelete: (period: ProjectContractPeriodDto) => void
  onEdit: (period: ProjectContractPeriodDto) => void
}) {
  const totalAmount = periods.reduce((sum, period) => sum + period.amount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Contract Periods</CardTitle>
            <CardDescription>Admin-only Annual retainer periods loaded from Project/GetProjectContractPeriods.</CardDescription>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contract Period
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to load contract periods</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <EconomicsMetric label="Periods count" value={periods.length.toString()} />
          <EconomicsMetric label="Total amount" value={formatCurrency(totalAmount)} />
          <EconomicsMetric label="Latest end date" value={periods.length === 0 ? "-" : format(parseISO(periods[periods.length - 1].endDate), "MMM d, yyyy")} />
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading contract periods...</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{error ? "Contract periods are unavailable." : "No contract period configured yet"}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment date</TableHead>
                    <TableHead className="text-right">Consumption</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(parseISO(period.startDate), "MMM d, yyyy")} - {format(parseISO(period.endDate), "MMM d, yyyy")}</p>
                          {period.note && <p className="max-w-[260px] truncate text-xs text-muted-foreground">{period.note}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(period.amount)}</TableCell>
                      <TableCell>{period.paymentDate ? format(parseISO(period.paymentDate), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(period.consumptionPercentage)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(period.balance)}</TableCell>
                      <TableCell>{getRetainerStatusBadge(period.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Edit contract period" onClick={() => onEdit(period)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete contract period" onClick={() => onDelete(period)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {periods.map((period) => (
                <Card key={period.id} className="py-3">
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{format(parseISO(period.startDate), "MMM d, yyyy")} - {format(parseISO(period.endDate), "MMM d, yyyy")}</p>
                        <p className="text-sm text-muted-foreground">{period.note || "No note"}</p>
                        <div className="mt-2">{getRetainerStatusBadge(period.status)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-semibold">{formatCurrency(period.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatPercent(period.consumptionPercentage)} consumed</p>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => onEdit(period)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => onDelete(period)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                      <div>Payment: {period.paymentDate ? format(parseISO(period.paymentDate), "MMM d, yyyy") : "-"}</div>
                      <div className="text-right">Balance: {formatCurrency(period.balance)}</div>
                      <div>Approved: {formatHours(period.approvedHours)}</div>
                      <div className="text-right">Internal: {formatCurrency(period.internalValueUsed)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ProjectMilestonesContent({
  milestones,
  isAdmin,
  onAdd,
  onDelete,
  onEdit,
}: {
  milestones: ProjectMilestoneDto[]
  isAdmin: boolean
  onAdd: () => void
  onDelete: (milestone: ProjectMilestoneDto) => void
  onEdit: (milestone: ProjectMilestoneDto) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Milestones</CardTitle>
            <CardDescription>Project milestones loaded from Project/GetProject.</CardDescription>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No milestones yet</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    {isAdmin && <TableHead className="w-[120px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Milestone className="h-4 w-4 text-muted-foreground" />
                          <span>{milestone.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{format(parseISO(milestone.date), "MMM d, yyyy")}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Edit milestone" onClick={() => onEdit(milestone)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete milestone" onClick={() => onDelete(milestone)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {milestones.map((milestone) => (
                <Card key={milestone.id} className="py-3">
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Milestone className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium truncate">{milestone.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{format(parseISO(milestone.date), "MMM d, yyyy")}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col items-end">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(milestone)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(milestone)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const { isAdmin } = useAuth()
  const [project, setProject] = useState<ProjectDetailDto | null>(null)
  const [workItems, setWorkItems] = useState<WorkItemListItemDto[]>([])
  const [economics, setEconomics] = useState<ProjectEconomicsDto | null>(null)
  const [payments, setPayments] = useState<ProjectPaymentDto[]>([])
  const [contractPeriods, setContractPeriods] = useState<ProjectContractPeriodDto[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [isContractPeriodDialogOpen, setIsContractPeriodDialogOpen] = useState(false)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [editingContractPeriod, setEditingContractPeriod] = useState<ProjectContractPeriodDto | null>(null)
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneDto | null>(null)
  const [editingPayment, setEditingPayment] = useState<ProjectPaymentDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(true)
  const [isLoadingContractPeriods, setIsLoadingContractPeriods] = useState(false)
  const [isLoadingEconomics, setIsLoadingEconomics] = useState(false)
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [workItemsError, setWorkItemsError] = useState<string | null>(null)
  const [contractPeriodsError, setContractPeriodsError] = useState<string | null>(null)
  const [economicsError, setEconomicsError] = useState<string | null>(null)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await getProject(id)
      setProject(response)
    } catch (error) {
      setProject(null)
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  const loadWorkItems = useCallback(async () => {
    setIsLoadingWorkItems(true)
    setWorkItemsError(null)

    try {
      const response = await getWorkItems({ projectId: id, includeClosed: true })
      setWorkItems(response)
    } catch (error) {
      setWorkItems([])
      setWorkItemsError(getErrorMessage(error))
    } finally {
      setIsLoadingWorkItems(false)
    }
  }, [id])

  useEffect(() => {
    void loadWorkItems()
  }, [loadWorkItems])

  const loadEconomics = useCallback(async () => {
    if (!isAdmin) return

    setIsLoadingEconomics(true)
    setEconomicsError(null)

    try {
      const response = await getProjectEconomics(id)
      setEconomics(response)
    } catch (error) {
      setEconomics(null)
      setEconomicsError(getErrorMessage(error))
    } finally {
      setIsLoadingEconomics(false)
    }
  }, [id, isAdmin])

  useEffect(() => {
    void loadEconomics()
  }, [loadEconomics])

  const loadPayments = useCallback(async () => {
    if (!isAdmin || project?.paymentType !== "TimeAndMaterial") {
      setPayments([])
      setPaymentsError(null)
      return
    }

    setIsLoadingPayments(true)
    setPaymentsError(null)

    try {
      const response = await getProjectPayments(id)
      setPayments(response)
    } catch (error) {
      setPayments([])
      setPaymentsError(getErrorMessage(error))
    } finally {
      setIsLoadingPayments(false)
    }
  }, [id, isAdmin, project?.paymentType])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  const loadContractPeriods = useCallback(async () => {
    if (!isAdmin || project?.paymentType !== "AnnualRetainer") {
      setContractPeriods([])
      setContractPeriodsError(null)
      return
    }

    setIsLoadingContractPeriods(true)
    setContractPeriodsError(null)

    try {
      const response = await getProjectContractPeriods(id)
      setContractPeriods(response)
    } catch (error) {
      setContractPeriods([])
      setContractPeriodsError(getErrorMessage(error))
    } finally {
      setIsLoadingContractPeriods(false)
    }
  }, [id, isAdmin, project?.paymentType])

  useEffect(() => {
    void loadContractPeriods()
  }, [loadContractPeriods])

  useEffect(() => {
    if (activeTab === "payments" && project?.paymentType !== "TimeAndMaterial") {
      setActiveTab("overview")
    }
    if (activeTab === "contractperiods" && project?.paymentType !== "AnnualRetainer") {
      setActiveTab("overview")
    }
  }, [activeTab, project?.paymentType])

  const handleDeleteConfirmed = async () => {
    if (!project || !deleteTarget) return

    setIsDeleting(true)
    try {
      if (deleteTarget.type === "payment") {
        await deleteProjectPayment({ projectId: project.id, paymentId: deleteTarget.id })
        await loadPayments()
        await loadEconomics()
        toast.success("Payment deleted successfully")
      } else if (deleteTarget.type === "contractPeriod") {
        await deleteProjectContractPeriod({ projectId: project.id, contractPeriodId: deleteTarget.id })
        await loadContractPeriods()
        await loadEconomics()
        toast.success("Contract period deleted successfully")
      } else {
        await deleteProjectMilestone({ projectId: project.id, id: deleteTarget.id })
        await loadProject()
        toast.success("Milestone deleted successfully")
      }
      setDeleteTarget(null)
    } catch (error) {
      const message = getErrorMessage(error)
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const workItemSummary = project?.workItemSummary
  const openWorkItems = useMemo(() => {
    if (!workItemSummary) return 0
    return workItemSummary.new + workItemSummary.inProgress + workItemSummary.waitingInternal + workItemSummary.waitingCustomer
  }, [workItemSummary])
  const teamCount = project?.teamSummary?.length ?? 0
  const milestones = useMemo(() => [...(project?.milestones ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [project])

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => history.push("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading project...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadError || !project) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => history.push("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load project</AlertTitle>
          <AlertDescription>{loadError ?? "Project not found."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => history.push("/projects")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getStatusBadge(project.status)}
              <Badge variant="secondary" className={cn("font-medium", getPaymentBadgeClass(project.paymentType))}>
                {paymentTypeLabel(project.paymentType)}
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">{project.name}</h1>
            <p className="text-muted-foreground">{project.customer?.companyName ?? "Unknown customer"}</p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setIsProjectDialogOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs uppercase">Hours</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{project.hoursSummary?.loggedHours ?? 0}h</p>
            {isAdmin && <p className="text-xs text-muted-foreground">{project.hoursSummary?.approvedHours ?? 0}h approved</p>}
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FolderOpen className="h-4 w-4" />
              <span className="text-xs uppercase">Work Items</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{workItemSummary?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">{openWorkItems} open</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs uppercase">Team</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{teamCount}</p>
            <p className="text-xs text-muted-foreground">people involved</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Milestone className="h-4 w-4" />
              <span className="text-xs uppercase">Milestones</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold">{milestones.length}</p>
            <p className="text-xs text-muted-foreground">planned checkpoints</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workitems">Work Items</TabsTrigger>
            <TabsTrigger value="timeentries">Time Entries</TabsTrigger>
            {isAdmin && <TabsTrigger value="economics">Economics</TabsTrigger>}
            {isAdmin && project.paymentType === "TimeAndMaterial" && <TabsTrigger value="payments">Payments</TabsTrigger>}
            {isAdmin && project.paymentType === "AnnualRetainer" && <TabsTrigger value="contractperiods">Contract Periods</TabsTrigger>}
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium text-right">{project.customer?.companyName ?? "Unknown"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="text-right">{project.customer?.contactPerson ?? "N/A"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-primary text-right">{project.customer?.contactEmail ?? "N/A"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Payment Type</span>
                  <span className="font-medium text-right">{paymentTypeLabel(project.paymentType)}</span>
                </div>
                <div className="flex justify-between gap-4">
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hours Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Logged Hours</span>
                  <span className="font-mono">{project.hoursSummary?.loggedHours ?? 0}h</span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved Hours</span>
                    <span className="font-mono">{project.hoursSummary?.approvedHours ?? 0}h</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">People Involved</span>
                  <span>{teamCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Work Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{workItemSummary?.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New</span>
                  <span>{workItemSummary?.new ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress</span>
                  <span>{workItemSummary?.inProgress ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waiting Internal</span>
                  <span>{workItemSummary?.waitingInternal ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waiting Customer</span>
                  <span>{workItemSummary?.waitingCustomer ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open Total</span>
                  <span>{openWorkItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed</span>
                  <span>{workItemSummary?.closed ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Archived</span>
                  <span>{workItemSummary?.archived ?? 0}</span>
                </div>
                {(workItemSummary?.unassigned ?? 0) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Unassigned</span>
                    <span>{workItemSummary?.unassigned}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Billing Settings</CardTitle>
                  <CardDescription>Read-only project billing values returned by the API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {project.paymentType === "TimeAndMaterial" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Junior Rate</span>
                        <span className="font-mono">{formatCurrency(project.juniorRate ?? 0)}/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mid Rate</span>
                        <span className="font-mono">{formatCurrency(project.midRate ?? 0)}/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Senior Rate</span>
                        <span className="font-mono">{formatCurrency(project.seniorRate ?? 0)}/h</span>
                      </div>
                    </>
                  )}
                  {project.paymentType === "FixedPrice" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fixed Amount</span>
                      <span className="font-mono">{formatCurrency(project.fixedAmount ?? 0)}</span>
                    </div>
                  )}
                  {(project.paymentType === "AnnualRetainer" || project.paymentType === "Internal") && (
                    <p className="text-muted-foreground">No additional base billing values are returned for this payment type yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Team Summary</CardTitle>
                  <CardDescription>Aggregated from backend project time data.</CardDescription>
                </CardHeader>
                <CardContent>
                  {teamCount === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No team activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {project.teamSummary.map((member) => (
                        <div key={member.employeeId} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{member.fullName ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{member.level}</p>
                          </div>
                          <div className="text-right font-mono">
                            <p>{member.loggedHours}h</p>
                            {isAdmin && <p className="text-xs text-muted-foreground">{member.approvedHours}h approved</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="workitems">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Work Items</CardTitle>
                  <CardDescription>Read-only Work Items loaded from WorkItem/GetWorkItems for this project.</CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" disabled title="Work Item write API integration pending">
                    New Work Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {workItemsError && (
                <Alert variant="destructive" className="mb-4">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Unable to load work items</AlertTitle>
                  <AlertDescription>{workItemsError}</AlertDescription>
                </Alert>
              )}

              {isLoadingWorkItems ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading work items...</p>
                </div>
              ) : workItems.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {workItemsError ? "Work items are unavailable." : "No work items yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead>Opened</TableHead>
                          <TableHead>Closed</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          {isAdmin && <TableHead className="text-right">Approved</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workItems.map((workItem) => (
                          <TableRow
                            key={workItem.id}
                            className="cursor-pointer"
                            tabIndex={0}
                            onClick={() => history.push(`/work-items/${workItem.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                history.push(`/work-items/${workItem.id}`)
                              }
                            }}
                          >
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {workItem.code || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[280px]">
                                <p className="font-medium truncate">{workItem.title}</p>
                                {workItem.description && (
                                  <p className="text-xs text-muted-foreground truncate">{workItem.description}</p>
                                )}
                                {workItem.externalReference && (
                                  <p className="text-xs text-muted-foreground truncate">Ref: {workItem.externalReference}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start gap-1">
                                <StatusBadge status={statusDisplayName(workItem)} />
                                {workItem.customerDisplayName && workItem.customerDisplayName !== workItem.statusName && (
                                  <span className="text-xs text-muted-foreground">Customer: {workItem.customerDisplayName}</span>
                                )}
                                <Badge variant={workItem.isClosed ? "secondary" : "outline"} className="text-xs">
                                  {workItem.isClosed ? "Closed" : "Open"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell><PriorityBadge priority={workItem.priority} /></TableCell>
                            <TableCell>
                              {workItem.assigneeName ? (
                                <span className="text-muted-foreground">{workItem.assigneeName}</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{originLabel(workItem.origin)}</Badge>
                            </TableCell>
                            <TableCell>{format(parseISO(workItem.openingDate), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              {workItem.closingDate ? format(parseISO(workItem.closingDate), "MMM d, yyyy") : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{workItem.loggedHours}h</TableCell>
                            {isAdmin && (
                              <TableCell className="text-right font-mono tabular-nums">
                                {workItem.approvedHours == null ? "-" : `${workItem.approvedHours}h`}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {workItems.map((workItem) => (
                      <Card
                        key={workItem.id}
                        className="cursor-pointer py-3"
                        role="button"
                        tabIndex={0}
                        onClick={() => history.push(`/work-items/${workItem.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            history.push(`/work-items/${workItem.id}`)
                          }
                        }}
                      >
                        <CardContent>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs text-muted-foreground">{workItem.code || "-"}</p>
                              <h3 className="font-medium truncate">{workItem.title}</h3>
                              {workItem.description && (
                                <p className="text-sm text-muted-foreground truncate">{workItem.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <StatusBadge status={statusDisplayName(workItem)} />
                                <PriorityBadge priority={workItem.priority} />
                                <Badge variant={workItem.isClosed ? "secondary" : "outline"}>
                                  {workItem.isClosed ? "Closed" : "Open"}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-medium">{workItem.loggedHours}h</p>
                              {isAdmin && (
                                <p className="text-xs text-muted-foreground">
                                  {workItem.approvedHours == null ? "-" : `${workItem.approvedHours}h approved`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                            <div>
                              <span>Assignee: </span>
                              <span className={workItem.assigneeName ? "" : "text-amber-600"}>
                                {workItem.assigneeName ?? "Unassigned"}
                              </span>
                            </div>
                            <div className="text-right">Origin: {originLabel(workItem.origin)}</div>
                            <div>Opened: {format(parseISO(workItem.openingDate), "MMM d, yyyy")}</div>
                            <div className="text-right">
                              Closed: {workItem.closingDate ? format(parseISO(workItem.closingDate), "MMM d, yyyy") : "-"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeentries">
          <PendingIntegration
            title="Time entries API integration pending"
            description="Project hours summaries come from the backend. Detailed time entry rows will be connected in a later API slice."
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="economics">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Project Economics</CardTitle>
                    <CardDescription>Admin-only economics loaded from Project/GetProjectEconomics.</CardDescription>
                  </div>
                  <Badge variant="secondary" className={cn("w-fit font-medium", getPaymentBadgeClass(project.paymentType))}>
                    {paymentTypeLabel(project.paymentType)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {economicsError && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Unable to load economics</AlertTitle>
                    <AlertDescription>{economicsError}</AlertDescription>
                  </Alert>
                )}

                {isLoadingEconomics ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading economics...</p>
                  </div>
                ) : economics ? (
                  <ProjectEconomicsContent economics={economics} project={project} />
                ) : (
                  <EmptyEconomicsState message={economicsError ? "Economics are unavailable." : "No economics data returned."} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && project.paymentType === "TimeAndMaterial" && (
          <TabsContent value="payments">
            <ProjectPaymentsContent
              payments={payments}
              isLoading={isLoadingPayments}
              error={paymentsError}
              onAdd={() => {
                setEditingPayment(null)
                setIsPaymentDialogOpen(true)
              }}
              onDelete={(payment) => setDeleteTarget({
                type: "payment",
                id: payment.id,
                label: `${formatCurrency(payment.amount)} payment from ${format(parseISO(payment.paymentDate), "MMM d, yyyy")}`,
              })}
              onEdit={(payment) => {
                setEditingPayment(payment)
                setIsPaymentDialogOpen(true)
              }}
            />
          </TabsContent>
        )}

        {isAdmin && project.paymentType === "AnnualRetainer" && (
          <TabsContent value="contractperiods">
            <ProjectContractPeriodsContent
              periods={contractPeriods}
              isLoading={isLoadingContractPeriods}
              error={contractPeriodsError}
              onAdd={() => {
                setEditingContractPeriod(null)
                setIsContractPeriodDialogOpen(true)
              }}
              onDelete={(period) => setDeleteTarget({
                type: "contractPeriod",
                id: period.id,
                label: `${format(parseISO(period.startDate), "MMM d, yyyy")} - ${format(parseISO(period.endDate), "MMM d, yyyy")}`,
              })}
              onEdit={(period) => {
                setEditingContractPeriod(period)
                setIsContractPeriodDialogOpen(true)
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="milestones">
          <ProjectMilestonesContent
            milestones={milestones}
            isAdmin={isAdmin}
            onAdd={() => {
              setEditingMilestone(null)
              setIsMilestoneDialogOpen(true)
            }}
            onDelete={(milestone) => setDeleteTarget({
              type: "milestone",
              id: milestone.id,
              label: milestone.title,
            })}
            onEdit={(milestone) => {
              setEditingMilestone(milestone)
              setIsMilestoneDialogOpen(true)
            }}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings">
            <PendingIntegration
              title="Project settings API integration pending"
              description="Use the top-level Edit action for base project fields. Advanced settings remain pending."
            />
          </TabsContent>
        )}
      </Tabs>

      <ProjectFormDialog
        open={isProjectDialogOpen}
        project={project}
        onOpenChange={setIsProjectDialogOpen}
        onSaved={(savedProject) => {
          setProject(savedProject)
          void loadEconomics()
          void loadContractPeriods()
          void loadPayments()
        }}
      />
      <ProjectContractPeriodDialog
        open={isContractPeriodDialogOpen}
        projectId={project.id}
        period={editingContractPeriod}
        onOpenChange={(open) => {
          setIsContractPeriodDialogOpen(open)
          if (!open) setEditingContractPeriod(null)
        }}
        onSaved={async () => {
          await loadContractPeriods()
          await loadEconomics()
        }}
      />
      <ProjectMilestoneDialog
        open={isMilestoneDialogOpen}
        projectId={project.id}
        milestone={editingMilestone}
        onOpenChange={(open) => {
          setIsMilestoneDialogOpen(open)
          if (!open) setEditingMilestone(null)
        }}
        onSaved={loadProject}
      />
      <ProjectPaymentDialog
        open={isPaymentDialogOpen}
        projectId={project.id}
        payment={editingPayment}
        onOpenChange={(open) => {
          setIsPaymentDialogOpen(open)
          if (!open) setEditingPayment(null)
        }}
        onSaved={async () => {
          await loadPayments()
          await loadEconomics()
        }}
      />
      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "contractPeriod" ? "contract period" : deleteTarget?.type ?? "item"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.label ?? "the selected item"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
