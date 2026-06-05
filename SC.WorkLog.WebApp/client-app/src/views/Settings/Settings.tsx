import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "helpers/services/AuthContext"
import {
  createCustomer,
  createEmployee,
  createStatusConfig,
  createWorkLogUser,
  ensureDefaultStatuses,
  findWorkLogUserByEmployeeId,
  findWorkLogUsersByCustomerId,
  getCustomers,
  getEmployees,
  getWorkLogUsers,
  updateCustomer,
  updateEmployee,
  updateStatusConfig,
  updateWorkLogUser,
  type CustomerDto,
  type EmployeeDto,
  type EmployeeLevel,
  type StatusConfigDto,
  type WorkItemStatusTypology,
  type WorkLogUserDto,
  type WorkLogUserRole,
} from "helpers/services/worklog-api"
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
import { Separator } from "components/ui/separator"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog"
import { Badge } from "components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { toast } from "sonner"
import { 
  Building2,
  Users,
  Search,
  Plus,
  Pencil,
  Settings,
  ShieldAlert,
} from "lucide-react"

const fullName = (employee: Pick<EmployeeDto, "firstName" | "lastName">) =>
  `${employee.firstName} ${employee.lastName}`.trim()

const nullableText = (value: FormDataEntryValue | null) => {
  const text = value?.toString().trim() ?? ""
  return text || null
}

const stringValue = (value: FormDataEntryValue | null) => value?.toString().trim() ?? ""

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === 'object' && error && 'response' in error
    ? (error as { response?: { data?: unknown } }).response?.data
    : null
  const errors = responseData && typeof responseData === 'object'
    ? ((responseData as { errors?: unknown; Errors?: unknown }).errors ?? (responseData as { errors?: unknown; Errors?: unknown }).Errors)
    : null
  if (Array.isArray(errors) && errors.every((item) => typeof item === 'string')) return errors.join(' ')
  if (error instanceof Error && error.message) return error.message
  return "Unexpected error. Please try again."
}

const statusTypologyOptions: Array<{ value: WorkItemStatusTypology; label: string }> = [
  { value: "New", label: "New" },
  { value: "InProgress", label: "In progress" },
  { value: "WaitingInternal", label: "Waiting internal" },
  { value: "WaitingCustomer", label: "Waiting customer" },
  { value: "Closed", label: "Closed" },
  { value: "Archived", label: "Archived" },
]

const statusTypologyLabel = (typology: WorkItemStatusTypology) =>
  statusTypologyOptions.find((option) => option.value === typology)?.label ?? typology

const toStatusKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export default function SettingsPage() {
  const { isAdmin } = useAuth()
  
  const [activeTab, setActiveTab] = useState("statuses")
  const [statusConfigs, setStatusConfigs] = useState<StatusConfigDto[]>([])
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [workLogUsers, setWorkLogUsers] = useState<WorkLogUserDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Customer state
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all")
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null)
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  
  // Employee state
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [employeeLevelFilter, setEmployeeLevelFilter] = useState("all")
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all")
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDto | null>(null)
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)

  // Status state
  const [editingStatus, setEditingStatus] = useState<StatusConfigDto | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)

  const loadSettingsData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [employeesResponse, customersResponse, statusesResponse] = await Promise.all([
        getEmployees(),
        getCustomers(),
        ensureDefaultStatuses(),
      ])
      const linkedUserResponses = await Promise.all([
        ...employeesResponse.map((employee) => getWorkLogUsers({ userType: "Employee", employeeId: employee.id })),
        ...customersResponse.map((customer) => getWorkLogUsers({ userType: "Customer", customerId: customer.id })),
      ])
      setStatusConfigs(statusesResponse)
      setEmployees(employeesResponse)
      setCustomers(customersResponse)
      setWorkLogUsers(linkedUserResponses.flat())
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    void loadSettingsData()
  }, [isAdmin, loadSettingsData])

  const statusRows = useMemo(() => [...statusConfigs].sort((a, b) => a.order - b.order), [statusConfigs])

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  const employeeAccessUser = editingEmployee
    ? findWorkLogUserByEmployeeId(workLogUsers, editingEmployee.id)
    : null
  const customerPortalUsers = editingCustomer
    ? findWorkLogUsersByCustomerId(workLogUsers, editingCustomer.id)
    : []
  const primaryCustomerPortalUser = customerPortalUsers[0] ?? null

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.contactEmail.toLowerCase().includes(customerSearch.toLowerCase())
    const matchesStatus = customerStatusFilter === "all" || (customerStatusFilter === "active" ? customer.active : !customer.active)
    return matchesSearch && matchesStatus
  })

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(employeeSearch.toLowerCase()) ||
      employee.email.toLowerCase().includes(employeeSearch.toLowerCase())
    const matchesLevel = employeeLevelFilter === "all" || employee.level === employeeLevelFilter
    const matchesStatus = employeeStatusFilter === "all" || (employeeStatusFilter === "active" ? employee.active : !employee.active)
    return matchesSearch && matchesLevel && matchesStatus
  })

  const handleSaveStatus = async (formData: FormData) => {
    const statusData = {
      name: stringValue(formData.get("name")),
      typology: formData.get("typology") as WorkItemStatusTypology,
      customerDisplayName: stringValue(formData.get("customerDisplayName")),
      order: parseInt(formData.get("order") as string, 10) || 0,
      active: formData.get("active") === "true",
    }
    const statusKey = stringValue(formData.get("key"))

    setIsSaving(true)
    try {
      if (editingStatus) {
        await updateStatusConfig({ id: editingStatus.id, ...statusData })
      } else {
        await createStatusConfig({ key: statusKey || toStatusKey(statusData.name), ...statusData })
      }

      await loadSettingsData()
      toast.success(editingStatus ? "Status updated successfully" : "Status created successfully")
      setIsStatusDialogOpen(false)
      setEditingStatus(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCustomer = async (formData: FormData) => {
    const customerData = {
      companyName: stringValue(formData.get("companyName")),
      companyDomain: nullableText(formData.get("companyDomain")),
      contactPerson: stringValue(formData.get("contactPerson")),
      contactEmail: stringValue(formData.get("contactEmail")),
      contactPhone: nullableText(formData.get("contactPhone")),
      active: formData.get("active") === "true",
    }

    const enablePortalUser = formData.get("enablePortalUser") === "true"
    const portalUserActive = formData.get("portalUserActive") === "true"
    const portalUserEmail = stringValue(formData.get("portalUserEmail"))
    const portalUserDisplayName = stringValue(formData.get("portalUserDisplayName"))
    const existingPortalUser = editingCustomer ? primaryCustomerPortalUser : null

    setIsSaving(true)
    try {
      const savedCustomer = editingCustomer
        ? await updateCustomer({ id: editingCustomer.id, ...customerData })
        : await createCustomer(customerData)

      try {
        if (enablePortalUser) {
          const request = {
            email: portalUserEmail,
            userType: "Customer" as const,
            role: "Customer" as const,
            employeeId: null,
            customerId: savedCustomer.id,
            displayName: portalUserDisplayName || savedCustomer.contactPerson,
            active: portalUserActive,
          }

          if (existingPortalUser) {
            await updateWorkLogUser({ id: existingPortalUser.id, ...request })
          } else {
            await createWorkLogUser(request)
          }
        } else if (existingPortalUser) {
          await updateWorkLogUser({
            id: existingPortalUser.id,
            email: existingPortalUser.email,
            userType: "Customer",
            role: "Customer",
            employeeId: null,
            customerId: savedCustomer.id,
            displayName: existingPortalUser.displayName,
            active: false,
          })
        }
      } catch (error) {
        await loadSettingsData()
        toast.error(`Customer saved, but portal user configuration failed: ${getErrorMessage(error)}`)
        return
      }

      await loadSettingsData()
      toast.success(editingCustomer ? "Customer updated successfully" : "Customer created successfully")
      setIsCustomerDialogOpen(false)
      setEditingCustomer(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEmployee = async (formData: FormData) => {
    const employeeData = {
      firstName: stringValue(formData.get("firstName")),
      lastName: stringValue(formData.get("lastName")),
      email: stringValue(formData.get("email")),
      level: formData.get("level") as EmployeeLevel,
      defaultHourlyRate: parseFloat(formData.get("defaultHourlyRate") as string) || 0,
      expectedDailyHours: parseFloat(formData.get("expectedDailyHours") as string) || 8,
      active: formData.get("active") === "true",
    }

    const enableLogin = formData.get("enableLogin") === "true"
    const accessRole = formData.get("accessRole") as Extract<WorkLogUserRole, "Admin" | "Employee">
    const accessActive = formData.get("accessActive") === "true"
    const existingUser = editingEmployee ? employeeAccessUser : null

    setIsSaving(true)
    try {
      const savedEmployee = editingEmployee
        ? await updateEmployee({ id: editingEmployee.id, ...employeeData })
        : await createEmployee(employeeData)

      try {
        if (enableLogin) {
          const request = {
            email: savedEmployee.email,
            userType: "Employee" as const,
            role: accessRole,
            employeeId: savedEmployee.id,
            customerId: null,
            displayName: fullName(savedEmployee),
            active: accessActive,
          }

          if (existingUser) {
            await updateWorkLogUser({ id: existingUser.id, ...request })
          } else {
            await createWorkLogUser(request)
          }
        } else if (existingUser) {
          await updateWorkLogUser({
            id: existingUser.id,
            email: savedEmployee.email,
            userType: "Employee",
            role: existingUser.role === "Admin" ? "Admin" : "Employee",
            employeeId: savedEmployee.id,
            customerId: null,
            displayName: fullName(savedEmployee),
            active: false,
          })
        }
      } catch (error) {
        await loadSettingsData()
        toast.error(`Employee saved, but application access configuration failed: ${getErrorMessage(error)}`)
        return
      }

      await loadSettingsData()
      toast.success(editingEmployee ? "Employee updated successfully" : "Employee created successfully")
      setIsEmployeeDialogOpen(false)
      setEditingEmployee(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading settings..." : `${customers.length} customers, ${employees.filter(e => e.active).length} active employees`}
          </p>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load Settings data</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-[420px] grid-cols-3">
          <TabsTrigger value="statuses">
            Statuses
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Building2 className="mr-2 h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Employees
          </TabsTrigger>
        </TabsList>

        {/* Statuses Tab */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle>Work Item Statuses</CardTitle>
              <CardDescription>
                Configure free workflow statuses. The first active status with typology New is used as the default initial status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Typology</TableHead>
                    <TableHead>Customer display name</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Order</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusRows.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-mono text-xs">{status.key}</TableCell>
                      <TableCell className="font-medium">{status.name}</TableCell>
                      <TableCell>{statusTypologyLabel(status.typology)}</TableCell>
                      <TableCell>{status.customerDisplayName}</TableCell>
                      <TableCell>
                        {status.isClosed ? (
                          <Badge variant="secondary">Closed</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.active ? "default" : "secondary"}>
                          {status.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{status.order}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditingStatus(status); setIsStatusDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => { setEditingStatus(null); setIsStatusDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium">Customers</h2>
              <Button onClick={() => { setEditingCustomer(null); setIsCustomerDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>

            <div className="bg-card border rounded-sm p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={customerStatusFilter} onValueChange={setCustomerStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card border rounded-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.companyName}</TableCell>
                        <TableCell>{customer.contactPerson}</TableCell>
                        <TableCell>{customer.contactEmail}</TableCell>
                        <TableCell>{customer.contactPhone}</TableCell>
                        <TableCell>
                          <Badge variant={customer.active ? "default" : "secondary"}>
                            {customer.active ? "Active" : "Inactive"}
                          </Badge>
                          {findWorkLogUsersByCustomerId(workLogUsers, customer.id).some((user) => user.active) && (
                            <Badge variant="outline" className="ml-2">Portal user</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingCustomer(customer); setIsCustomerDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium">Employees</h2>
              <Button onClick={() => { setEditingEmployee(null); setIsEmployeeDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </div>

            <div className="bg-card border rounded-sm p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={employeeLevelFilter} onValueChange={setEmployeeLevelFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card border rounded-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Hourly Rate</TableHead>
                    <TableHead className="text-right">Daily Hours</TableHead>
                    <TableHead>Application Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.level}</Badge>
                        </TableCell>
                        <TableCell className="text-right">${employee.defaultHourlyRate}/h</TableCell>
                        <TableCell className="text-right">{employee.expectedDailyHours}h</TableCell>
                        <TableCell>
                          {(() => {
                            const accessUser = findWorkLogUserByEmployeeId(workLogUsers, employee.id)
                            if (!accessUser) return <Badge variant="secondary">No login</Badge>

                            return (
                              <div className="flex flex-wrap gap-1">
                                <Badge variant={accessUser.active ? "default" : "secondary"}>
                                  {accessUser.active ? "Login enabled" : "Login inactive"}
                                </Badge>
                                <Badge variant="outline">{accessUser.role}</Badge>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.active ? "default" : "secondary"}>
                            {employee.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingEmployee(employee); setIsEmployeeDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? "Edit Status" : "Add Status"}</DialogTitle>
            <DialogDescription>
              Status typology provides the business meaning. Closed/Open behavior is derived from typology.
            </DialogDescription>
          </DialogHeader>
          <form
            key={editingStatus?.id ?? "new-status"}
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveStatus(new FormData(event.currentTarget))
            }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="statusKey">Key</Label>
                <Input
                  id="statusKey"
                  name="key"
                  defaultValue={editingStatus?.key || ""}
                  placeholder="e.g., code-review"
                  readOnly={Boolean(editingStatus)}
                  required={!editingStatus}
                />
                <p className="text-xs text-muted-foreground">
                  Stable lowercase kebab-case key. It cannot be changed after creation.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="statusName">Name</Label>
                <Input id="statusName" name="name" defaultValue={editingStatus?.name || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="statusTypology">Typology</Label>
                <Select name="typology" defaultValue={editingStatus?.typology || "New"}>
                  <SelectTrigger id="statusTypology">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTypologyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerDisplayName">Customer display name</Label>
                <Input
                  id="customerDisplayName"
                  name="customerDisplayName"
                  defaultValue={editingStatus?.customerDisplayName || ""}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use this to hide internal statuses from customers, for example Code review as In progress.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="statusOrder">Order</Label>
                  <Input
                    id="statusOrder"
                    name="order"
                    type="number"
                    min="0"
                    defaultValue={editingStatus?.order ?? 10}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="statusActive">Active</Label>
                  <Select name="active" defaultValue={editingStatus?.active !== false ? "true" : "false"}>
                    <SelectTrigger id="statusActive">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {editingStatus ? "Save Changes" : "Add Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update customer information" : "Add a new customer to the system"}
            </DialogDescription>
          </DialogHeader>
          <form
            key={`${editingCustomer?.id ?? "new"}-${primaryCustomerPortalUser?.id ?? "no-portal-user"}`}
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveCustomer(new FormData(event.currentTarget))
            }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" name="companyName" defaultValue={editingCustomer?.companyName || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyDomain">Company Domain</Label>
                <Input id="companyDomain" name="companyDomain" placeholder="e.g., videndum.com" defaultValue={editingCustomer?.companyDomain || ""} />
                <p className="text-xs text-muted-foreground">Used for client login (e.g., videndum.com)</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" defaultValue={editingCustomer?.contactPerson || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={editingCustomer?.contactEmail || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={editingCustomer?.contactPhone || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="active">Status</Label>
                <Select name="active" defaultValue={editingCustomer?.active !== false ? "true" : "false"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-4 rounded-md border p-4">
                <div>
                  <h3 className="font-medium">Portal users</h3>
                  <p className="text-sm text-muted-foreground">
                    Customer portal access is prepared but not enabled yet.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="enablePortalUser">Main contact portal user</Label>
                  <Select name="enablePortalUser" defaultValue={primaryCustomerPortalUser ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Create/update portal user</SelectItem>
                      <SelectItem value="false">Do not create / deactivate portal user</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="portalUserEmail">Portal user email</Label>
                  <Input
                    id="portalUserEmail"
                    name="portalUserEmail"
                    type="email"
                    defaultValue={primaryCustomerPortalUser?.email || editingCustomer?.contactEmail || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="portalUserDisplayName">Portal user display name</Label>
                  <Input
                    id="portalUserDisplayName"
                    name="portalUserDisplayName"
                    defaultValue={primaryCustomerPortalUser?.displayName || editingCustomer?.contactPerson || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="portalUserActive">Portal user status</Label>
                  <Select name="portalUserActive" defaultValue={primaryCustomerPortalUser?.active !== false ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {customerPortalUsers.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {customerPortalUsers.length} portal users exist for this customer. This form updates the first one for now.
                  </p>
                )}
                <Badge variant="secondary">Customer portal not enabled</Badge>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {editingCustomer ? "Save Changes" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? "Update employee information" : "Add a new employee to the system"}
            </DialogDescription>
          </DialogHeader>
          <form
            key={`${editingEmployee?.id ?? "new"}-${employeeAccessUser?.id ?? "no-login"}`}
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveEmployee(new FormData(event.currentTarget))
            }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={editingEmployee?.firstName || ""} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={editingEmployee?.lastName || ""} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="level">Level</Label>
                <Select name="level" defaultValue={editingEmployee?.level || "Mid"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="defaultHourlyRate">Hourly Rate ($)</Label>
                  <Input id="defaultHourlyRate" name="defaultHourlyRate" type="number" step="0.01" defaultValue={editingEmployee?.defaultHourlyRate || 50} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDailyHours">Daily Hours</Label>
                  <Input id="expectedDailyHours" name="expectedDailyHours" type="number" step="0.5" defaultValue={editingEmployee?.expectedDailyHours || 8} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="active">Status</Label>
                <Select name="active" defaultValue={editingEmployee?.active !== false ? "true" : "false"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-4 rounded-md border p-4">
                <div>
                  <h3 className="font-medium">Application access</h3>
                  <p className="text-sm text-muted-foreground">
                    Login and authorization are stored in WorkLogUser, not on Employee.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="enableLogin">Enable login</Label>
                  <Select name="enableLogin" defaultValue={employeeAccessUser ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled</SelectItem>
                      <SelectItem value="false">Disabled / deactivate linked access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessRole">Role</Label>
                  <Select name="accessRole" defaultValue={employeeAccessUser?.role === "Admin" ? "Admin" : "Employee"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessActive">WorkLogUser status</Label>
                  <Select name="accessActive" defaultValue={employeeAccessUser?.active !== false ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {editingEmployee ? "Save Changes" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
