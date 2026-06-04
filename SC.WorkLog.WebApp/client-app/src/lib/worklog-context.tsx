import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth, type WorkLogCurrentUser } from 'helpers/services/AuthContext'
import {
  employees,
  customers,
  projects,
  workItems,
  workItemComments,
  timeEntries,
  leaveRequests,
  overtimeRequests,
  statusConfigs,
  projectPayments,
  projectContractPeriods,
  type Employee,
  type Customer,
  type Project,
  type WorkItem,
  type WorkItemComment,
  type TimeEntry,
  type LeaveRequest,
  type OvertimeRequest,
  type StatusConfig,
  type ProjectPayment,
  type ProjectContractPeriod,
} from './mock-data'

export type UserRole = 'Admin' | 'Employee'

interface WorkLogContextType {
  // Role
  role: UserRole
  setRole: (role: UserRole) => void
  currentUser: Employee

  // Data
  employees: Employee[]
  customers: Customer[]
  projects: Project[]
  workItems: WorkItem[]
  workItemComments: WorkItemComment[]
  timeEntries: TimeEntry[]
  leaveRequests: LeaveRequest[]
  overtimeRequests: OvertimeRequest[]
  statusConfigs: StatusConfig[]
  projectPayments: ProjectPayment[]
  projectContractPeriods: ProjectContractPeriod[]

  // Actions
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void
  addLeaveRequest: (request: Omit<LeaveRequest, 'id'>) => void
  updateLeaveRequest: (id: string, updates: Partial<LeaveRequest>) => void
  updateOvertimeRequest: (id: string, updates: Partial<OvertimeRequest>) => void
  addWorkItem: (item: Omit<WorkItem, 'id'>) => void
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void
  addWorkItemComment: (comment: Omit<WorkItemComment, 'id'>) => void
  addCustomer: (customer: Omit<Customer, 'id'>) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  addProject: (project: Omit<Project, 'id'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  addEmployee: (employee: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, updates: Partial<Employee>) => void
}

const WorkLogContext = createContext<WorkLogContextType | undefined>(undefined)

const createBackendEmployeeFallback = (backendCurrentUser: WorkLogCurrentUser): Employee => {
  const displayName = backendCurrentUser.name || backendCurrentUser.email || 'Backend WorkLog user'
  const [firstName, ...lastNameParts] = displayName.trim().split(/\s+/)

  return {
    id: backendCurrentUser.employeeId ?? 'backend-employee',
    firstName: firstName || 'Backend',
    lastName: lastNameParts.join(' ') || 'WorkLog profile (mock fallback)',
    email: backendCurrentUser.email,
    level: 'Senior',
    defaultHourlyRate: 0,
    expectedDailyHours: 8,
    active: true,
  }
}

export function WorkLogProvider({ children }: { children: ReactNode }) {
  const { currentUser: backendCurrentUser } = useAuth()
  const [role, setRole] = useState<UserRole>('Admin')
  const [employeesData, setEmployeesData] = useState<Employee[]>(employees)
  const [customersData, setCustomersData] = useState<Customer[]>(customers)
  const [projectsData, setProjectsData] = useState<Project[]>(projects)
  const [workItemsData, setWorkItemsData] = useState<WorkItem[]>(workItems)
  const [workItemCommentsData, setWorkItemCommentsData] = useState<WorkItemComment[]>(workItemComments)
  const [timeEntriesData, setTimeEntriesData] = useState<TimeEntry[]>(timeEntries)
  const [leaveRequestsData, setLeaveRequestsData] = useState<LeaveRequest[]>(leaveRequests)
  const [overtimeRequestsData, setOvertimeRequestsData] = useState<OvertimeRequest[]>(overtimeRequests)
  const [statusConfigsData] = useState<StatusConfig[]>(statusConfigs)
  const [projectPaymentsData] = useState<ProjectPayment[]>(projectPayments)
  const [projectContractPeriodsData] = useState<ProjectContractPeriod[]>(projectContractPeriods)

  const currentUser = useMemo(() => {
    if (backendCurrentUser?.isEmployee && backendCurrentUser.employeeId) {
      return employeesData.find((employee) => employee.id === backendCurrentUser.employeeId)
        ?? createBackendEmployeeFallback(backendCurrentUser)
    }

    return employeesData[0]
  }, [backendCurrentUser, employeesData])

  useEffect(() => {
    if (!backendCurrentUser?.isEmployee || !backendCurrentUser.employeeId) return
    if (employeesData.some((employee) => employee.id === backendCurrentUser.employeeId)) return

    console.warn(
      `WorkLog mock data does not contain employee ${backendCurrentUser.employeeId}; using a temporary backend-profile fallback until pages are API-backed.`
    )
  }, [backendCurrentUser, employeesData])

  useEffect(() => {
    if (backendCurrentUser?.role === 'Admin' || backendCurrentUser?.role === 'Employee') {
      setRole(backendCurrentUser.role)
    }
  }, [backendCurrentUser?.role])

  const addTimeEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry = { ...entry, id: `te-${Date.now()}` }
    setTimeEntriesData((prev) => [...prev, newEntry])

    // Check if overtime request needs to be created
    const existingEntries = timeEntriesData.filter(
      (e) => e.employeeId === entry.employeeId && e.date === entry.date
    )
    const totalHours = existingEntries.reduce((sum, e) => sum + e.time, 0) + entry.time
    const employee = employeesData.find((e) => e.id === entry.employeeId)

    if (employee && totalHours > employee.expectedDailyHours) {
      const overtimeHours = totalHours - employee.expectedDailyHours
      const existingOT = overtimeRequestsData.find(
        (ot) => ot.employeeId === entry.employeeId && ot.date === entry.date
      )

      if (!existingOT) {
        setOvertimeRequestsData((prev) => [
          ...prev,
          {
            id: `ot-${Date.now()}`,
            employeeId: entry.employeeId,
            date: entry.date,
            calculatedHours: overtimeHours,
            approvedHours: 0,
            status: 'Pending approval',
          },
        ])
      } else {
        setOvertimeRequestsData((prev) =>
          prev.map((ot) =>
            ot.id === existingOT.id ? { ...ot, calculatedHours: overtimeHours } : ot
          )
        )
      }
    }
  }

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntriesData((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    )
  }

  const addLeaveRequest = (request: Omit<LeaveRequest, 'id'>) => {
    const newRequest = { ...request, id: `lr-${Date.now()}` }
    setLeaveRequestsData((prev) => [...prev, newRequest])
  }

  const updateLeaveRequest = (id: string, updates: Partial<LeaveRequest>) => {
    setLeaveRequestsData((prev) =>
      prev.map((request) => (request.id === id ? { ...request, ...updates } : request))
    )
  }

  const updateOvertimeRequest = (id: string, updates: Partial<OvertimeRequest>) => {
    setOvertimeRequestsData((prev) =>
      prev.map((request) => (request.id === id ? { ...request, ...updates } : request))
    )
  }

  const addWorkItem = (item: Omit<WorkItem, 'id'>) => {
    const newItem = { ...item, id: `wi-${Date.now()}` }
    setWorkItemsData((prev) => [...prev, newItem])
  }

  const updateWorkItem = (id: string, updates: Partial<WorkItem>) => {
    setWorkItemsData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const addWorkItemComment = (comment: Omit<WorkItemComment, 'id'>) => {
    const newComment = { ...comment, id: `wic-${Date.now()}` }
    setWorkItemCommentsData((prev) => [...prev, newComment])
  }

  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    const newCustomer = { ...customer, id: `cust-${Date.now()}` }
    setCustomersData((prev) => [...prev, newCustomer])
  }

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomersData((prev) =>
      prev.map((customer) => (customer.id === id ? { ...customer, ...updates } : customer))
    )
  }

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: `proj-${Date.now()}` }
    setProjectsData((prev) => [...prev, newProject])
  }

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjectsData((prev) =>
      prev.map((project) => (project.id === id ? { ...project, ...updates } : project))
    )
  }

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee = { ...employee, id: `emp-${Date.now()}` }
    setEmployeesData((prev) => [...prev, newEmployee])
  }

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployeesData((prev) =>
      prev.map((employee) => (employee.id === id ? { ...employee, ...updates } : employee))
    )
  }

  return (
    <WorkLogContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        employees: employeesData,
        customers: customersData,
        projects: projectsData,
        workItems: workItemsData,
        workItemComments: workItemCommentsData,
        timeEntries: timeEntriesData,
        leaveRequests: leaveRequestsData,
        overtimeRequests: overtimeRequestsData,
        statusConfigs: statusConfigsData,
        projectPayments: projectPaymentsData,
        projectContractPeriods: projectContractPeriodsData,
        addTimeEntry,
        updateTimeEntry,
        addLeaveRequest,
        updateLeaveRequest,
        updateOvertimeRequest,
        addWorkItem,
        updateWorkItem,
        addWorkItemComment,
        addCustomer,
        updateCustomer,
        addProject,
        updateProject,
        addEmployee,
        updateEmployee,
      }}
    >
      {children}
    </WorkLogContext.Provider>
  )
}

export function useWorkLog() {
  const context = useContext(WorkLogContext)
  if (context === undefined) {
    throw new Error('useWorkLog must be used within a WorkLogProvider')
  }
  return context
}
