import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useHistory, useParams } from "react-router-dom"
import { format, parseISO } from "date-fns"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  MessageSquare,
  ShieldAlert,
  User,
} from "lucide-react"
import { useAuth } from "helpers/services/AuthContext"
import {
  getWorkItem,
  type WorkItemListItemDto,
  type WorkItemOrigin,
  type WorkItemStatusTypology,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Badge } from "components/ui/badge"
import { Button } from "components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card"
import { PriorityBadge, StatusBadge } from "components/status-badges"

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to view this work item."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load work item detail. Please try again."
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

const typologyLabel = (typology: WorkItemStatusTypology) => {
  switch (typology) {
    case "InProgress":
      return "In progress"
    case "WaitingInternal":
      return "Waiting internal"
    case "WaitingCustomer":
      return "Waiting customer"
    default:
      return typology
  }
}

const statusDisplayName = (workItem: WorkItemListItemDto) =>
  workItem.statusName || workItem.customerDisplayName || workItem.statusKey

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}

export default function WorkItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const { isAdmin } = useAuth()
  const [workItem, setWorkItem] = useState<WorkItemListItemDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadWorkItem = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await getWorkItem(id)
      setWorkItem(response)
    } catch (error) {
      setWorkItem(null)
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadWorkItem()
  }, [loadWorkItem])

  const backTarget = useMemo(() => {
    if (workItem?.projectId) return `/projects/${workItem.projectId}`
    return "/work-items"
  }, [workItem?.projectId])

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => history.push("/work-items")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Items
        </Button>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading work item...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadError || !workItem) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => history.push("/work-items")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Items
        </Button>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load work item</AlertTitle>
          <AlertDescription>{loadError ?? "Work item not found."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => history.push(backTarget)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {workItem.code && <span className="text-sm font-mono text-muted-foreground">{workItem.code}</span>}
            <StatusBadge status={statusDisplayName(workItem)} />
            <PriorityBadge priority={workItem.priority} />
            <Badge variant={workItem.isClosed ? "secondary" : "outline"}>
              {workItem.isClosed ? "Closed" : "Open"}
            </Badge>
            {workItem.isPriority && <Badge className="bg-red-500/10 text-red-600 border-red-200">Priority</Badge>}
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{workItem.title}</h1>
          <p className="text-muted-foreground">{workItem.projectName ?? "Unknown project"} · {workItem.customerName ?? "Unknown customer"}</p>
        </div>
        <Button variant="outline" size="sm" disabled title="Work Item write API integration pending">
          Edit pending
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
              <CardDescription>Read-only data loaded from WorkItem/GetWorkItem.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {workItem.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </CardTitle>
              <CardDescription>Comments retrieval and comment writes are pending API integration.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No API-backed comments are loaded in this phase.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Status is resolved from backend StatusKey fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Internal status</span>
                <StatusBadge status={statusDisplayName(workItem)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status key</span>
                <span className="font-mono">{workItem.statusKey}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Typology</span>
                <Badge variant="outline">{typologyLabel(workItem.statusTypology)}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Customer display</span>
                <span>{workItem.customerDisplayName ?? "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow icon={<Building2 className="h-4 w-4" />} label="Customer" value={workItem.customerName ?? "N/A"} />
              <DetailRow icon={<FolderOpen className="h-4 w-4" />} label="Project" value={workItem.projectName ?? "N/A"} />
              <DetailRow icon={<User className="h-4 w-4" />} label="Assignee" value={workItem.assigneeName ?? "Unassigned"} />
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Opened" value={formatDate(workItem.openingDate)} />
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Closed" value={formatDate(workItem.closingDate)} />
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Logged hours" value={formatHours(workItem.loggedHours)} />
              {isAdmin && (
                <DetailRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Approved hours"
                  value={workItem.approvedHours == null ? "-" : formatHours(workItem.approvedHours)}
                />
              )}
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Origin" value={<Badge variant="outline">{originLabel(workItem.origin)}</Badge>} />
              {workItem.externalReference && (
                <DetailRow icon={<ExternalLink className="h-4 w-4" />} label="External reference" value={workItem.externalReference} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
