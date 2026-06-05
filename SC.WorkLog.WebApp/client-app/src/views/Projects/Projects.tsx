import { useCallback, useEffect, useMemo, useState } from "react"
import { useHistory } from "react-router-dom"
import { useAuth } from "helpers/services/AuthContext"
import {
  getProject,
  getProjects,
  searchProjects,
  type ProjectDetailDto,
  type ProjectListItemDto,
  type ProjectPaymentType,
  type ProjectSearchParams,
  type ProjectStatus,
} from "helpers/services/worklog-api"
import { ProjectFormDialog } from "components/project-form-dialog"
import { Button } from "components/ui/button"
import { Input } from "components/ui/input"
import { Card, CardContent } from "components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import { Badge } from "components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import {
  Search,
  FolderKanban,
  Clock,
  FileText,
  CircleDot,
  Pencil,
  Plus,
  ExternalLink,
  ShieldAlert,
} from "lucide-react"
import { cn } from "lib/utils"
import { toast } from "sonner"

type StatusTab = "all" | ProjectStatus
type PaymentFilter = "all" | ProjectPaymentType

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to view projects."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load projects. Please try again."
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

const getPaymentBadge = (paymentType: ProjectPaymentType) => {
  switch (paymentType) {
    case "TimeAndMaterial":
      return { label: "T&M", className: "bg-blue-500/15 text-blue-600 border-blue-500/20" }
    case "FixedPrice":
      return { label: "Fixed", className: "bg-violet-500/15 text-violet-600 border-violet-500/20" }
    case "AnnualRetainer":
      return { label: "Retainer", className: "bg-cyan-500/15 text-cyan-600 border-cyan-500/20" }
    case "Internal":
      return { label: "Internal", className: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20" }
    default:
      return { label: paymentType, className: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20" }
  }
}

const getStatusColor = (status: ProjectStatus) => {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
    case "Suspended":
      return "bg-amber-500/15 text-amber-600 border-amber-500/20"
    case "Closed":
      return "bg-zinc-500/15 text-zinc-600 border-zinc-500/20"
    default:
      return "bg-zinc-500/15 text-zinc-600 border-zinc-500/20"
  }
}

const statusTabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Active", label: "Active" },
  { key: "Suspended", label: "Suspended" },
  { key: "Closed", label: "Closed" },
]

export default function ProjectsPage() {
  const history = useHistory()
  const { isAdmin } = useAuth()
  const [projects, setProjects] = useState<ProjectListItemDto[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusTab, setStatusTab] = useState<StatusTab>("all")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [editingProject, setEditingProject] = useState<ProjectDetailDto | null>(null)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [loadingEditProjectId, setLoadingEditProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const hasPaymentFilter = isAdmin && paymentFilter !== "all"
      const hasFilters = searchQuery.trim() || statusTab !== "all" || hasPaymentFilter
      const params: ProjectSearchParams = {
        search: searchQuery.trim() || undefined,
        status: statusTab === "all" ? undefined : statusTab,
        paymentType: hasPaymentFilter ? paymentFilter : undefined,
      }
      const response = hasFilters ? await searchProjects(params) : await getProjects()
      setProjects(response)
    } catch (error) {
      setProjects([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin, paymentFilter, searchQuery, statusTab])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const statusCounts = useMemo(() => ({
    all: projects.length,
    Active: projects.filter((project) => project.status === "Active").length,
    Suspended: projects.filter((project) => project.status === "Suspended").length,
    Closed: projects.filter((project) => project.status === "Closed").length,
  }), [projects])

  const handleNewProject = () => {
    setEditingProject(null)
    setIsProjectDialogOpen(true)
  }

  const handleEditProject = async (projectId: string) => {
    setLoadingEditProjectId(projectId)
    try {
      const project = await getProject(projectId)
      setEditingProject(project)
      setIsProjectDialogOpen(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoadingEditProjectId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading projects..." : `${projects.length} projects`}
              </p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={handleNewProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load projects</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                statusTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className={cn(
                "ml-2 text-xs tabular-nums",
                statusTab === tab.key ? "text-muted-foreground" : "text-muted-foreground/70"
              )}>
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="TimeAndMaterial">Time & Material</SelectItem>
                <SelectItem value="FixedPrice">Fixed Price</SelectItem>
                <SelectItem value="AnnualRetainer">Annual Retainer</SelectItem>
                <SelectItem value="Internal">Internal</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {loadError ? "Fix the API error and reload the page." : "Try adjusting your filters or search query."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px]">Project</TableHead>
                <TableHead>Customer</TableHead>
                {isAdmin && <TableHead>Type</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Work Items</TableHead>
                <TableHead className="text-center">Hours</TableHead>
                <TableHead className="w-[90px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const paymentBadge = project.paymentType ? getPaymentBadge(project.paymentType) : null
                return (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer group"
                    onClick={() => history.push(`/projects/${project.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          {project.isDefault && (
                            <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                              Default
                            </Badge>
                          )}
                          {project.openWorkItemCount > 0 && (
                            <p className="text-xs text-amber-600">{project.openWorkItemCount} open</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{project.customerName ?? "Unknown"}</span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {paymentBadge && project.paymentType && (
                          <Badge variant="outline" className={cn("text-xs font-medium", paymentBadge.className)} title={paymentTypeLabel(project.paymentType)}>
                            {paymentBadge.label}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-medium", getStatusColor(project.status))}>
                        <CircleDot className="mr-1 h-3 w-3" />
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium tabular-nums">{project.workItemCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium tabular-nums">{project.loggedHours.toFixed(0)}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit project"
                            disabled={loadingEditProjectId === project.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleEditProject(project.id)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ProjectFormDialog
        open={isProjectDialogOpen}
        project={editingProject}
        onOpenChange={(open) => {
          setIsProjectDialogOpen(open)
          if (!open) setEditingProject(null)
        }}
        onSaved={async () => {
          await loadProjects()
        }}
      />
    </div>
  )
}
