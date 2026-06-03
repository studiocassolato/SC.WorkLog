import { useParams, useHistory } from "react-router-dom"
import { useState, useMemo } from "react"
import { useWorkLog } from "lib/worklog-context"
import { Button } from "components/ui/button"
import { Badge } from "components/ui/badge"
import { Textarea } from "components/ui/textarea"
import { Avatar, AvatarFallback } from "components/ui/avatar"
import { Checkbox } from "components/ui/checkbox"
import { Separator } from "components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Building2,
  FolderOpen,
  ExternalLink,
  MessageSquare,
  Send,
} from "lucide-react"
import { format, parseISO } from "date-fns"

function getStatusColor(status: string) {
  switch (status) {
    case "Open":
      return "bg-blue-100 text-blue-800"
    case "In progress":
      return "bg-yellow-100 text-yellow-800"
    case "Completed":
      return "bg-green-100 text-green-800"
    case "Closed":
      return "bg-gray-100 text-gray-800"
    case "On hold":
      return "bg-orange-100 text-orange-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "Urgent":
      return "bg-red-100 text-red-800"
    case "High":
      return "bg-orange-100 text-orange-800"
    case "Normal":
      return "bg-blue-100 text-blue-800"
    case "Low":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export default function WorkItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const { workItems, workItemComments, projects, customers, employees, timeEntries, currentUser, addWorkItemComment, updateWorkItem } = useWorkLog()

  const [newComment, setNewComment] = useState("")
  const [isInternal, setIsInternal] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>("")

  const workItem = useMemo(() => {
    return workItems.find((wi) => wi.id === id)
  }, [workItems, id])

  const project = useMemo(() => {
    if (!workItem) return null
    return projects.find((p) => p.id === workItem.projectId)
  }, [workItem, projects])

  const customer = useMemo(() => {
    if (!project) return null
    return customers.find((c) => c.id === project.customerId)
  }, [project, customers])

  const assignee = useMemo(() => {
    if (!workItem || !workItem.assigneeId) return null
    return employees.find((e) => e.id === workItem.assigneeId)
  }, [workItem, employees])

  const comments = useMemo(() => {
    if (!workItem) return []
    return workItemComments
      .filter((c) => c.workItemId === workItem.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [workItem, workItemComments])

  const relatedTimeEntries = useMemo(() => {
    if (!workItem) return []
    return timeEntries.filter((te) => te.workItemId === workItem.id)
  }, [workItem, timeEntries])

  const totalHours = useMemo(() => {
    return relatedTimeEntries.reduce((sum, te) => sum + te.time, 0)
  }, [relatedTimeEntries])

  // Initialize status when workItem loads
  useState(() => {
    if (workItem && !selectedStatus) {
      setSelectedStatus(workItem.status)
    }
  })

  if (!workItem) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Work item not found</h2>
          <p className="text-muted-foreground mt-2">The requested work item does not exist.</p>
          <Button onClick={() => history.push("/work-items")} className="mt-4">
            Back to Work Items
          </Button>
        </div>
      </div>
    )
  }

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
    updateWorkItem(workItem.id, { 
      status: newStatus as typeof workItem.status,
      closingDate: newStatus === "Closed" || newStatus === "Completed" ? format(new Date(), "yyyy-MM-dd") : workItem.closingDate
    })
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    addWorkItemComment({
      workItemId: workItem.id,
      employeeId: currentUser.id,
      content: newComment,
      isInternal,
      createdAt: new Date().toISOString(),
    })
    setNewComment("")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => history.push("/work-items")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-muted-foreground">{workItem.code}</span>
            <Badge className={getStatusColor(selectedStatus || workItem.status)}>{selectedStatus || workItem.status}</Badge>
            <Badge variant="outline" className={getPriorityColor(workItem.priority)}>{workItem.priority}</Badge>
            {workItem.origin !== "Manual" && (
              <Badge variant="secondary">{workItem.origin}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{workItem.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-card border rounded-sm p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
            <p className="text-foreground">{workItem.description}</p>
          </div>

          {/* Comments Section */}
          <div className="bg-card border rounded-sm p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </h3>
            
            <div className="space-y-4">
              {comments.map((comment) => {
                const author = employees.find((e) => e.id === comment.employeeId)
                return (
                  <div key={comment.id} className={`flex gap-3 ${comment.isInternal ? "bg-muted/50 p-3 rounded-sm" : ""}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {author ? getInitials(author.firstName, author.lastName) : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {author ? `${author.firstName} ${author.lastName}` : "Unknown"}
                        </span>
                        {comment.isInternal && (
                          <Badge variant="outline" className="text-xs">Internal</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(comment.createdAt), "MMM d, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                  </div>
                )
              })}

              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
              )}
            </div>

            <Separator className="my-4" />

            {/* Add Comment */}
            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                  />
                  <label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                    Internal note (not visible to customer)
                  </label>
                </div>
                <Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>
          </div>

          {/* Time Entries */}
          {relatedTimeEntries.length > 0 && (
            <div className="bg-card border rounded-sm p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Entries ({relatedTimeEntries.length})
              </h3>
              <div className="space-y-2">
                {relatedTimeEntries.map((entry) => {
                  const emp = employees.find((e) => e.id === entry.employeeId)
                  return (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{entry.date}</span>
                        <span className="text-sm">{emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{entry.notes}</span>
                        <span className="text-sm font-medium">{entry.time}h</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Change */}
          <div className="bg-card border rounded-sm p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Status</h3>
            <Select value={selectedStatus || workItem.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In progress">In progress</SelectItem>
                <SelectItem value="On hold">On hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Details */}
          <div className="bg-card border rounded-sm p-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{customer?.companyName || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="text-sm font-medium">{project?.name || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Assignee</p>
                  <p className="text-sm font-medium">
                    {assignee ? `${assignee.firstName} ${assignee.lastName}` : "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="text-sm font-medium">{workItem.openingDate}</p>
                </div>
              </div>

              {workItem.closingDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Closed</p>
                    <p className="text-sm font-medium">{workItem.closingDate}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                  <p className="text-sm font-medium">{totalHours}h logged</p>
                </div>
              </div>

              {workItem.externalReference && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">External Reference</p>
                    <p className="text-sm font-medium">{workItem.externalReference}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
