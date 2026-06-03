import { useState, useMemo } from "react"
import { useHistory } from "react-router-dom"
import { useWorkLog } from "lib/worklog-context"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "components/ui/dialog"
import { Label } from "components/ui/label"
import { Textarea } from "components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu"
import { Progress } from "components/ui/progress"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  FolderKanban, 
  Pencil, 
  Clock, 
  FileText,
  CircleDot,
  ExternalLink
} from "lucide-react"
import { cn } from "lib/utils"
import type { Project } from "lib/mock-data"

type StatusTab = 'all' | 'Active' | 'Suspended' | 'Closed'

export default function ProjectsPage() {
  const { projects, customers, workItems, timeEntries, addProject, updateProject, role } = useWorkLog()
  const history = useHistory()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusTab, setStatusTab] = useState<StatusTab>("all")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const isAdmin = role === "Admin"

  // Calculate project stats
  const projectStats = useMemo(() => {
    return projects.map(project => {
      const projectWorkItems = workItems.filter(w => w.projectId === project.id)
      const projectTimeEntries = timeEntries.filter(te => {
        const wi = workItems.find(w => w.id === te.workItemId)
        return wi?.projectId === project.id
      })
      const totalHours = projectTimeEntries.reduce((sum, te) => sum + te.time, 0)
      const openWorkItems = projectWorkItems.filter(w => w.status !== 'Closed' && w.status !== 'Completed').length
      const lastActivity = projectTimeEntries.length > 0 
        ? projectTimeEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date
        : null
      
      // Calculate budget progress for fixed price
      let budgetProgress = 0
      if (project.paymentType === 'Fixed price' && project.fixedAmount) {
        const avgRate = 70 // Average rate for estimation
        const estimatedCost = totalHours * avgRate
        budgetProgress = Math.min((estimatedCost / project.fixedAmount) * 100, 100)
      }

      return {
        ...project,
        totalHours,
        workItemCount: projectWorkItems.length,
        openWorkItems,
        lastActivity,
        budgetProgress
      }
    })
  }, [projects, workItems, timeEntries])

  const filteredProjects = projectStats.filter((project) => {
    const customer = customers.find((c) => c.id === project.customerId)
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusTab === "all" || project.status === statusTab
    const matchesPayment = paymentFilter === "all" || project.paymentType === paymentFilter
    return matchesSearch && matchesStatus && matchesPayment
  })

  const statusCounts = useMemo(() => ({
    all: projects.length,
    Active: projects.filter(p => p.status === 'Active').length,
    Suspended: projects.filter(p => p.status === 'Suspended').length,
    Closed: projects.filter(p => p.status === 'Closed').length,
  }), [projects])

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer?.companyName || "Unknown"
  }

  const handleCreateProject = (formData: FormData) => {
    const paymentType = formData.get("paymentType") as Project["paymentType"]
    const newProject: Omit<Project, "id"> = {
      customerId: formData.get("customerId") as string,
      name: formData.get("name") as string,
      paymentType,
      status: "Active",
      notes: formData.get("notes") as string || "",
      milestones: [],
      ...(paymentType === "Time & material" && {
        juniorRate: Number(formData.get("juniorRate")) || 50,
        midRate: Number(formData.get("midRate")) || 70,
        seniorRate: Number(formData.get("seniorRate")) || 90,
      }),
      ...(paymentType === "Fixed price" && {
        fixedAmount: Number(formData.get("fixedAmount")) || 0,
      }),
      ...(paymentType === "Annual retainer" && {
        annualAmount: Number(formData.get("annualAmount")) || 0,
      }),
    }
    addProject(newProject)
    setCreateDialogOpen(false)
  }

  const handleUpdateProject = (formData: FormData) => {
    if (!selectedProject) return
    const paymentType = formData.get("paymentType") as Project["paymentType"]
    const updates: Partial<Project> = {
      customerId: formData.get("customerId") as string,
      name: formData.get("name") as string,
      paymentType,
      status: formData.get("status") as Project["status"],
      notes: formData.get("notes") as string || "",
      ...(paymentType === "Time & material" && {
        juniorRate: Number(formData.get("juniorRate")) || 50,
        midRate: Number(formData.get("midRate")) || 70,
        seniorRate: Number(formData.get("seniorRate")) || 90,
      }),
      ...(paymentType === "Fixed price" && {
        fixedAmount: Number(formData.get("fixedAmount")) || 0,
      }),
      ...(paymentType === "Annual retainer" && {
        annualAmount: Number(formData.get("annualAmount")) || 0,
      }),
    }
    updateProject(selectedProject.id, updates)
    setEditDialogOpen(false)
    setSelectedProject(null)
  }

  const getStatusColor = (status: Project["status"]) => {
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

  const getPaymentBadge = (paymentType: Project["paymentType"]) => {
    switch (paymentType) {
      case "Time & material":
        return { label: "T&M", className: "bg-blue-500/15 text-blue-600 border-blue-500/20" }
      case "Fixed price":
        return { label: "Fixed", className: "bg-violet-500/15 text-violet-600 border-violet-500/20" }
      case "Annual retainer":
        return { label: "Retainer", className: "bg-cyan-500/15 text-cyan-600 border-cyan-500/20" }
      case "Internal":
        return { label: "Internal", className: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20" }
      default:
        return { label: paymentType, className: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20" }
    }
  }

  const formatLastActivity = (date: string | null) => {
    if (!date) return "No activity"
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'Active', label: 'Active' },
    { key: 'Suspended', label: 'Suspended' },
    { key: 'Closed', label: 'Closed' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground">
                {projects.length} projects across {customers.length} customers
              </p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  handleCreateProject(new FormData(event.currentTarget))
                }}
              >
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Set up a new project with billing configuration.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input id="name" name="name" placeholder="Website Redesign" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customerId">Customer *</Label>
                    <Select name="customerId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.filter(c => c.active).map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentType">Payment Type *</Label>
                    <Select name="paymentType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Time & material">Time & Material</SelectItem>
                        <SelectItem value="Fixed price">Fixed Price</SelectItem>
                        <SelectItem value="Annual retainer">Annual Retainer</SelectItem>
                        <SelectItem value="Internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="juniorRate">Junior Rate</Label>
                      <Input id="juniorRate" name="juniorRate" type="number" defaultValue="50" min="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="midRate">Mid Rate</Label>
                      <Input id="midRate" name="midRate" type="number" defaultValue="70" min="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="seniorRate">Senior Rate</Label>
                      <Input id="seniorRate" name="seniorRate" type="number" defaultValue="90" min="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fixedAmount">Fixed Amount</Label>
                      <Input id="fixedAmount" name="fixedAmount" type="number" defaultValue="0" min="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="annualAmount">Annual Amount</Label>
                      <Input id="annualAmount" name="annualAmount" type="number" defaultValue="0" min="0" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" placeholder="Project notes..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Project</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status Tabs + Search */}
      <div className="space-y-4">
        {/* Quick Filter Tabs */}
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

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects or customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Payment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Time & material">Time & Material</SelectItem>
              <SelectItem value="Fixed price">Fixed Price</SelectItem>
              <SelectItem value="Annual retainer">Annual Retainer</SelectItem>
              <SelectItem value="Internal">Internal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || statusTab !== 'all' || paymentFilter !== 'all'
                ? "Try adjusting your filters or search query"
                : "Get started by creating your first project"}
            </p>
            {isAdmin && !searchQuery && statusTab === 'all' && paymentFilter === 'all' && (
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px]">Project</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Work Items</TableHead>
                <TableHead className="text-center">Hours</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const paymentBadge = getPaymentBadge(project.paymentType)
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
                          {project.openWorkItems > 0 && (
                            <p className="text-xs text-amber-600">{project.openWorkItems} open</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{getCustomerName(project.customerId)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-medium", paymentBadge.className)}>
                        {paymentBadge.label}
                      </Badge>
                    </TableCell>
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
                        <span className="font-medium tabular-nums">{project.totalHours.toFixed(0)}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.paymentType === 'Fixed price' && project.fixedAmount ? (
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{project.budgetProgress.toFixed(0)}%</span>
                          </div>
                          <Progress value={project.budgetProgress} className="h-1.5" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatLastActivity(project.lastActivity)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProject(project)
                                setEditDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedProject && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleUpdateProject(new FormData(event.currentTarget))
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update project information and billing settings.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Project Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedProject.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-customerId">Customer *</Label>
                  <Select name="customerId" defaultValue={selectedProject.customerId}>
                    <SelectTrigger>
                      <SelectValue />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-paymentType">Payment Type *</Label>
                    <Select name="paymentType" defaultValue={selectedProject.paymentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Time & material">Time & Material</SelectItem>
                        <SelectItem value="Fixed price">Fixed Price</SelectItem>
                        <SelectItem value="Annual retainer">Annual Retainer</SelectItem>
                        <SelectItem value="Internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select name="status" defaultValue={selectedProject.status}>
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
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-juniorRate">Junior Rate</Label>
                    <Input
                      id="edit-juniorRate"
                      name="juniorRate"
                      type="number"
                      defaultValue={selectedProject.juniorRate || 50}
                      min="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-midRate">Mid Rate</Label>
                    <Input
                      id="edit-midRate"
                      name="midRate"
                      type="number"
                      defaultValue={selectedProject.midRate || 70}
                      min="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-seniorRate">Senior Rate</Label>
                    <Input
                      id="edit-seniorRate"
                      name="seniorRate"
                      type="number"
                      defaultValue={selectedProject.seniorRate || 90}
                      min="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-fixedAmount">Fixed Amount</Label>
                    <Input
                      id="edit-fixedAmount"
                      name="fixedAmount"
                      type="number"
                      defaultValue={selectedProject.fixedAmount || 0}
                      min="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-annualAmount">Annual Amount</Label>
                    <Input
                      id="edit-annualAmount"
                      name="annualAmount"
                      type="number"
                      defaultValue={selectedProject.annualAmount || 0}
                      min="0"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={selectedProject.notes}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
