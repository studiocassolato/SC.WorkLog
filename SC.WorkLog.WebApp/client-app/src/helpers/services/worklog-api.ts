import { apiClient } from './api-client'

export type EmployeeLevel = 'Junior' | 'Mid' | 'Senior'
export type WorkLogUserType = 'Employee' | 'Customer'
export type WorkLogUserRole = 'Admin' | 'Employee' | 'Customer'
export type WorkItemStatusTypology = 'New' | 'InProgress' | 'WaitingInternal' | 'WaitingCustomer' | 'Closed' | 'Archived'
export type ProjectPaymentType = 'TimeAndMaterial' | 'FixedPrice' | 'AnnualRetainer' | 'Internal'
export type ProjectStatus = 'Active' | 'Suspended' | 'Closed'
export type WorkItemPriority = 'Low' | 'Normal' | 'High' | 'Urgent'
export type WorkItemOrigin = 'Manual' | 'Jira' | 'AzureDevOps' | 'Email'
export type RequestStatus = 'PendingApproval' | 'Approved' | 'Rejected'
export type LeaveRequestType = 'Vacation' | 'Permission'
export type DailyTimeCompletenessStatus = 'OK' | 'MissingHours' | 'OvertimePending' | 'OvertimeApproved'
export type TimeAndMaterialBalanceStatus = 'CreditAvailable' | 'Balanced' | 'OverCredit'
export type RetainerPeriodStatus = 'Healthy' | 'Balanced' | 'OverRetainer'

export type EmployeeDto = {
  id: string
  firstName: string
  lastName: string
  email: string
  level: EmployeeLevel
  defaultHourlyRate: number
  expectedDailyHours: number
  active: boolean
}

export type CustomerDto = {
  id: string
  companyName: string
  companyDomain: string | null
  contactPerson: string
  contactEmail: string
  contactPhone: string | null
  active: boolean
}

export type WorkLogUserDto = {
  id: string
  email: string
  userType: WorkLogUserType
  role: WorkLogUserRole
  employeeId: string | null
  employeeName: string | null
  customerId: string | null
  customerName: string | null
  displayName: string | null
  active: boolean
}

export type StatusConfigDto = {
  id: string
  key: string
  name: string
  typology: WorkItemStatusTypology
  customerDisplayName: string
  order: number
  active: boolean
  isClosed: boolean
}

export type ProjectMilestoneDto = {
  id: string
  projectId: string
  title: string
  date: string
}

export type CreateProjectMilestoneRequest = Omit<ProjectMilestoneDto, 'id'>
export type UpdateProjectMilestoneRequest = ProjectMilestoneDto
export type DeleteProjectMilestoneRequest = Pick<ProjectMilestoneDto, 'id' | 'projectId'>

export type ProjectHoursSummaryDto = {
  loggedHours: number
  approvedHours: number
}

export type ProjectWorkItemSummaryDto = {
  total: number
  new: number
  inProgress: number
  waitingInternal: number
  waitingCustomer: number
  closed: number
  archived: number
  unassigned: number
}

export type ProjectTeamMemberDto = {
  employeeId: string
  fullName: string | null
  level: EmployeeLevel | null
  loggedHours: number
  approvedHours: number
}

export type ProjectCapabilitiesDto = {
  canViewEconomics: boolean
  canViewPayments: boolean
  canViewContractPeriods: boolean
  canEditProjectSettings: boolean
}

export type ProjectListItemDto = {
  id: string
  customerId: string
  customerName: string | null
  name: string
  paymentType: ProjectPaymentType | null
  status: ProjectStatus
  isDefault: boolean
  loggedHours: number
  workItemCount: number
  openWorkItemCount: number
}

export type ProjectDetailDto = {
  id: string
  customerId: string
  customer: CustomerDto | null
  name: string
  paymentType: ProjectPaymentType | null
  status: ProjectStatus
  notes: string | null
  isDefault: boolean
  juniorRate: number | null
  midRate: number | null
  seniorRate: number | null
  fixedAmount: number | null
  milestones: ProjectMilestoneDto[]
  hoursSummary: ProjectHoursSummaryDto | null
  workItemSummary: ProjectWorkItemSummaryDto | null
  teamSummary: ProjectTeamMemberDto[]
  capabilities: ProjectCapabilitiesDto | null
}

export type ProjectSearchParams = {
  search?: string
  customerId?: string
  status?: ProjectStatus
  paymentType?: ProjectPaymentType
}

export type CreateProjectRequest = {
  customerId: string
  name: string
  paymentType: ProjectPaymentType
  status: ProjectStatus
  notes: string | null
  isDefault: boolean
  juniorRate: number | null
  midRate: number | null
  seniorRate: number | null
  fixedAmount: number | null
}

export type UpdateProjectRequest = CreateProjectRequest & {
  id: string
}

export type MonthlyBalanceRowDto = {
  month: string
  approvedHours: number
  workedValue: number
  paymentsReceived: number
  monthlyBalance: number
  cumulativeBalance: number
}

export type TimeAndMaterialEconomicsDto = {
  approvedHours: number
  workedValue: number
  totalPaymentsReceived: number
  currentBalance: number
  balanceStatus: TimeAndMaterialBalanceStatus
  monthlyRows: MonthlyBalanceRowDto[]
}

export type FixedPriceEconomicsDto = {
  fixedAmount: number
  approvedHours: number
  internalValueUsed: number
  budgetConsumptionPercentage: number
  effectiveHourlyAverage: number
  remainingTheoreticalMargin: number
  overBudget: boolean
}

export type RetainerMonthlyRowDto = {
  month: string
  approvedHours: number
  internalValue: number
  cumulativeInternalValue: number
  expectedCumulativeValue: number
  delta: number
}

export type AnnualRetainerEconomicsDto = {
  contractPeriodId: string
  startDate: string
  endDate: string
  amount: number
  approvedHours: number
  internalValueUsed: number
  balance: number
  consumptionPercentage: number
  status: RetainerPeriodStatus
  monthlyRows: RetainerMonthlyRowDto[]
}

export type InternalValueByEmployeeDto = {
  employeeId: string
  approvedHours: number
  internalValue: number
}

export type MonthlyInternalValueDto = {
  month: string
  approvedHours: number
  internalValue: number
}

export type InternalProjectEconomicsDto = {
  approvedHours: number
  internalValue: number
  internalValueByEmployee: InternalValueByEmployeeDto[]
  monthlyInternalValue: MonthlyInternalValueDto[]
}

export type ProjectEconomicsDto = {
  annualRetainerPeriods: AnnualRetainerEconomicsDto[] | null
  timeAndMaterial: TimeAndMaterialEconomicsDto | null
  fixedPrice: FixedPriceEconomicsDto | null
  annualRetainer: AnnualRetainerEconomicsDto | null
  internal: InternalProjectEconomicsDto | null
}

export type ProjectPaymentDto = {
  id: string
  projectId: string
  paymentDate: string
  amount: number
  note: string | null
  createdOn: string
  createdBy: string | null
}

export type CreateProjectPaymentRequest = {
  projectId: string
  paymentDate: string
  amount: number
  note: string | null
}

export type UpdateProjectPaymentRequest = CreateProjectPaymentRequest & {
  id: string
}

export type DeleteProjectPaymentRequest = {
  projectId: string
  paymentId: string
}

export type ProjectContractPeriodDto = {
  id: string
  projectId: string
  startDate: string
  endDate: string
  amount: number
  paymentDate: string | null
  note: string | null
  internalValueUsed: number
  approvedHours: number
  balance: number
  consumptionPercentage: number
  status: RetainerPeriodStatus
}

export type CreateProjectContractPeriodRequest = {
  projectId: string
  startDate: string
  endDate: string
  amount: number
  paymentDate: string | null
  note: string | null
}

export type UpdateProjectContractPeriodRequest = CreateProjectContractPeriodRequest & {
  id: string
}

export type DeleteProjectContractPeriodRequest = {
  projectId: string
  contractPeriodId: string
}

export type WorkItemListItemDto = {
  id: string
  code: string | null
  projectId: string
  projectName: string | null
  customerId: string
  customerName: string | null
  title: string
  description: string | null
  statusKey: string
  statusName: string | null
  statusTypology: WorkItemStatusTypology
  customerDisplayName: string | null
  isClosed: boolean
  priority: WorkItemPriority
  assigneeId: string | null
  assigneeName: string | null
  reporter: string | null
  origin: WorkItemOrigin
  externalReference: string | null
  openingDate: string
  closingDate: string | null
  isPriority: boolean
  loggedHours: number
  approvedHours: number | null
}

export type WorkItemDetailDto = WorkItemListItemDto

export type WorkItemFilter = {
  search?: string
  projectId?: string
  customerId?: string
  assigneeId?: string
  unassignedOnly?: boolean
  statusKey?: string
  statusTypology?: WorkItemStatusTypology
  priority?: WorkItemPriority
  includeClosed?: boolean
}

export type TimeEntryListItemDto = {
  id: string
  employeeId: string
  employeeName: string | null
  workItemId: string
  workItemCode: string | null
  workItemTitle: string | null
  projectId: string
  projectName: string | null
  customerId: string
  customerName: string | null
  date: string
  time: number
  approvedTime: number | null
  description: string | null
  notes: string | null
  status: RequestStatus
  adminNote: string | null
  employeeLevelSnapshot: EmployeeLevel | null
  employeeDefaultRateSnapshot: number | null
  projectRateSnapshot: number | null
  calculatedValue: number | null
}

export type TimeEntryFilter = {
  employeeId?: string
  customerId?: string
  projectId?: string
  workItemId?: string
  status?: RequestStatus
  dateFrom?: string
  dateTo?: string
}

export type CreateTimeEntryRequest = {
  employeeId: string
  workItemId: string
  date: string
  time: number
  description: string | null
  notes: string | null
}

export type UpdateTimeEntryRequest = {
  id: string
  workItemId: string
  date: string
  time: number
  description: string | null
  notes: string | null
}

export type UpdateApprovedTimeRequest = {
  id: string
  approvedTime: number
  adminNote: string | null
}

export type LeaveRequestDto = {
  id: string
  employeeId: string
  employeeName: string | null
  type: LeaveRequestType
  date: string
  hours: number
  status: RequestStatus
  requestDate: string
  employeeNote: string | null
  adminNote: string | null
}

export type LeaveRequestFilter = {
  employeeId?: string
  type?: LeaveRequestType
  dateFrom?: string
  dateTo?: string
  status?: RequestStatus
}

export type CreateLeaveRequestRequest = {
  employeeId: string
  type: LeaveRequestType
  date: string
  hours: number
  employeeNote: string | null
}

export type ApproveLeaveRequestRequest = {
  id: string
  adminNote: string | null
}

export type RejectLeaveRequestRequest = {
  id: string
  adminNote: string | null
}

export type OvertimeRequestDto = {
  id: string
  employeeId: string
  employeeName: string | null
  date: string
  calculatedHours: number
  approvedHours: number
  status: RequestStatus
  adminNote: string | null
  dayTimeEntries: TimeEntryListItemDto[]
}

export type OvertimeRequestFilter = {
  employeeId?: string
  dateFrom?: string
  dateTo?: string
  status?: RequestStatus
}

export type ApproveOvertimeRequestRequest = {
  id: string
  approvedHours: number
  adminNote: string | null
}

export type RejectOvertimeRequestRequest = {
  id: string
  adminNote: string | null
}

export type DailyTimeCompletenessRowDto = {
  employeeId: string
  employeeName: string | null
  date: string
  workItemHours: number
  leaveHours: number
  dailyTotal: number
  expectedDailyHours: number
  missingHours: number
  overtimeHours: number
  status: DailyTimeCompletenessStatus
}

export type TimeCompletenessDto = {
  dateFrom: string
  dateTo: string
  rows: DailyTimeCompletenessRowDto[]
}

export type TimeCompletenessFilter = {
  employeeId?: string
  dateFrom: string
  dateTo: string
  status?: DailyTimeCompletenessStatus
}

export type CustomerReportWorkItemRowDto = {
  date: string
  customerId: string
  customerName: string | null
  projectId: string
  projectName: string | null
  workItemId: string
  workItemTitle: string | null
  hours: number
  approvedHours: number
  description: string | null
}

export type CustomerReportDto = {
  dateFrom: string
  dateTo: string
  customerId: string | null
  totalHours: number
  approvedHours: number
  workedValue: number
  rows: CustomerReportWorkItemRowDto[]
}

export type CustomerReportFilter = {
  customerId: string
  projectId?: string
  dateFrom: string
  dateTo: string
}

export type CreateWorkItemRequest = {
  code: string | null
  projectId: string
  title: string
  description: string | null
  statusKey: string | null
  priority: WorkItemPriority
  assigneeId: string | null
  reporter: string | null
  origin: WorkItemOrigin
  externalReference: string | null
  openingDate: string
  closingDate: string | null
  isPriority: boolean
}

export type UpdateWorkItemRequest = CreateWorkItemRequest & {
  id: string
}

export type SaveEmployeeRequest = Omit<EmployeeDto, 'id'>
export type SaveCustomerRequest = Omit<CustomerDto, 'id'>
export type SaveStatusConfigRequest = Omit<StatusConfigDto, 'id' | 'isClosed'>
export type UpdateStatusConfigRequest = Omit<StatusConfigDto, 'key' | 'isClosed'>
export type CreateWorkLogUserRequest = Omit<WorkLogUserDto, 'id' | 'employeeName' | 'customerName'>
export type UpdateWorkLogUserRequest = CreateWorkLogUserRequest & { id: string }
export type WorkLogUserFilter = {
  email?: string
  userType?: WorkLogUserType
  role?: WorkLogUserRole
  employeeId?: string
  customerId?: string
  active?: boolean
}

export const getEmployees = async () => {
  const response = await apiClient.get<EmployeeDto[]>('/Employee/GetEmployees')
  return response.data
}

export const getActiveEmployees = async () => {
  const response = await apiClient.get<EmployeeDto[]>('/Employee/GetActiveEmployees')
  return response.data
}

export const getProjects = async () => {
  const response = await apiClient.get<ProjectListItemDto[]>('/Project/GetProjects')
  return response.data
}

export const searchProjects = async (params?: ProjectSearchParams) => {
  const response = await apiClient.get<ProjectListItemDto[]>('/Project/SearchProjects', { params })
  return response.data
}

export const getProject = async (projectId: string) => {
  const response = await apiClient.get<ProjectDetailDto>('/Project/GetProject', { params: { projectId } })
  return response.data
}

export const createProject = async (request: CreateProjectRequest) => {
  const response = await apiClient.post<ProjectDetailDto>('/Project/CreateProject', request)
  return response.data
}

export const updateProject = async (request: UpdateProjectRequest) => {
  const response = await apiClient.post<ProjectDetailDto>('/Project/UpdateProject', request)
  return response.data
}

export const getProjectEconomics = async (projectId: string) => {
  const response = await apiClient.get<ProjectEconomicsDto>('/Project/GetProjectEconomics', { params: { projectId } })
  return response.data
}

export const getProjectPayments = async (projectId: string) => {
  const response = await apiClient.get<ProjectPaymentDto[]>('/Project/GetProjectPayments', { params: { projectId } })
  return response.data
}

export const createProjectPayment = async (request: CreateProjectPaymentRequest) => {
  const response = await apiClient.post<ProjectPaymentDto>('/Project/CreateProjectPayment', request)
  return response.data
}

export const updateProjectPayment = async (request: UpdateProjectPaymentRequest) => {
  const response = await apiClient.post<ProjectPaymentDto>('/Project/UpdateProjectPayment', request)
  return response.data
}

export const deleteProjectPayment = async (request: DeleteProjectPaymentRequest) => {
  await apiClient.post('/Project/DeleteProjectPayment', request)
}

export const getProjectContractPeriods = async (projectId: string) => {
  const response = await apiClient.get<ProjectContractPeriodDto[]>('/Project/GetProjectContractPeriods', { params: { projectId } })
  return response.data
}

export const createProjectContractPeriod = async (request: CreateProjectContractPeriodRequest) => {
  const response = await apiClient.post<ProjectContractPeriodDto>('/Project/CreateProjectContractPeriod', request)
  return response.data
}

export const updateProjectContractPeriod = async (request: UpdateProjectContractPeriodRequest) => {
  const response = await apiClient.post<ProjectContractPeriodDto>('/Project/UpdateProjectContractPeriod', request)
  return response.data
}

export const deleteProjectContractPeriod = async (request: DeleteProjectContractPeriodRequest) => {
  await apiClient.post('/Project/DeleteProjectContractPeriod', request)
}

export const createProjectMilestone = async (request: CreateProjectMilestoneRequest) => {
  const response = await apiClient.post<ProjectMilestoneDto>('/Project/CreateMilestone', request)
  return response.data
}

export const updateProjectMilestone = async (request: UpdateProjectMilestoneRequest) => {
  const response = await apiClient.post<ProjectMilestoneDto>('/Project/UpdateMilestone', request)
  return response.data
}

export const deleteProjectMilestone = async (request: DeleteProjectMilestoneRequest) => {
  await apiClient.post('/Project/DeleteMilestone', request)
}

export const getWorkItems = async (filter?: WorkItemFilter) => {
  const response = await apiClient.get<WorkItemListItemDto[]>('/WorkItem/GetWorkItems', { params: filter })
  return response.data
}

export const getWorkItem = async (workItemId: string) => {
  const response = await apiClient.get<WorkItemDetailDto>('/WorkItem/GetWorkItem', { params: { workItemId } })
  return response.data
}

export const createWorkItem = async (request: CreateWorkItemRequest) => {
  const response = await apiClient.post<WorkItemDetailDto>('/WorkItem/CreateWorkItem', request)
  return response.data
}

export const updateWorkItem = async (request: UpdateWorkItemRequest) => {
  const response = await apiClient.post<WorkItemDetailDto>('/WorkItem/UpdateWorkItem', request)
  return response.data
}

export const getTimeEntries = async (filter?: TimeEntryFilter) => {
  const response = await apiClient.get<TimeEntryListItemDto[]>('/TimeEntry/GetTimeEntries', { params: filter })
  return response.data
}

export const createTimeEntry = async (request: CreateTimeEntryRequest) => {
  const response = await apiClient.post<TimeEntryListItemDto>('/TimeEntry/CreateTimeEntry', request)
  return response.data
}

export const updateTimeEntry = async (request: UpdateTimeEntryRequest) => {
  const response = await apiClient.post<TimeEntryListItemDto>('/TimeEntry/UpdateTimeEntry', request)
  return response.data
}

export const updateApprovedTime = async (request: UpdateApprovedTimeRequest) => {
  const response = await apiClient.post<TimeEntryListItemDto>('/TimeEntry/UpdateApprovedTime', request)
  return response.data
}

export const getLeaveRequests = async (filter?: LeaveRequestFilter) => {
  const response = await apiClient.get<LeaveRequestDto[]>('/LeaveRequest/GetLeaveRequests', { params: filter })
  return response.data
}

export const createLeaveRequest = async (request: CreateLeaveRequestRequest) => {
  const response = await apiClient.post<LeaveRequestDto>('/LeaveRequest/CreateLeaveRequest', request)
  return response.data
}

export const approveLeaveRequest = async (request: ApproveLeaveRequestRequest) => {
  const response = await apiClient.post<LeaveRequestDto>('/LeaveRequest/ApproveLeaveRequest', request)
  return response.data
}

export const rejectLeaveRequest = async (request: RejectLeaveRequestRequest) => {
  const response = await apiClient.post<LeaveRequestDto>('/LeaveRequest/RejectLeaveRequest', request)
  return response.data
}

export const getOvertimeRequests = async (filter?: OvertimeRequestFilter) => {
  const response = await apiClient.get<OvertimeRequestDto[]>('/OvertimeRequest/GetOvertimeRequests', { params: filter })
  return response.data
}

export const getOvertimeRequest = async (overtimeRequestId: string) => {
  const response = await apiClient.get<OvertimeRequestDto>('/OvertimeRequest/GetOvertimeRequest', { params: { overtimeRequestId } })
  return response.data
}

export const approveOvertimeRequest = async (request: ApproveOvertimeRequestRequest) => {
  const response = await apiClient.post<OvertimeRequestDto>('/OvertimeRequest/ApproveOvertimeRequest', request)
  return response.data
}

export const rejectOvertimeRequest = async (request: RejectOvertimeRequestRequest) => {
  const response = await apiClient.post<OvertimeRequestDto>('/OvertimeRequest/RejectOvertimeRequest', request)
  return response.data
}

export const getTimeCompleteness = async (filter: TimeCompletenessFilter) => {
  const response = await apiClient.post<TimeCompletenessDto>('/TimeCompleteness/GetTimeCompleteness', filter)
  return response.data
}

export const getCustomerReport = async (filter: CustomerReportFilter) => {
  const response = await apiClient.post<CustomerReportDto>('/Report/GetCustomerReport', filter)
  return response.data
}

export const getStatusConfigs = async () => {
  const response = await apiClient.get<StatusConfigDto[]>('/StatusConfig/GetStatusConfigs')
  return response.data
}

export const ensureDefaultStatuses = async () => {
  const response = await apiClient.post<StatusConfigDto[]>('/StatusConfig/EnsureDefaultStatuses')
  return response.data
}

export const createStatusConfig = async (request: SaveStatusConfigRequest) => {
  const response = await apiClient.post<StatusConfigDto>('/StatusConfig/CreateStatusConfig', request)
  return response.data
}

export const updateStatusConfig = async (request: UpdateStatusConfigRequest) => {
  const response = await apiClient.post<StatusConfigDto>('/StatusConfig/UpdateStatusConfig', request)
  return response.data
}

export const createEmployee = async (request: SaveEmployeeRequest) => {
  const response = await apiClient.post<EmployeeDto>('/Employee/CreateEmployee', request)
  return response.data
}

export const updateEmployee = async (request: EmployeeDto) => {
  const response = await apiClient.post<EmployeeDto>('/Employee/UpdateEmployee', request)
  return response.data
}

export const getCustomers = async () => {
  const response = await apiClient.get<CustomerDto[]>('/Customer/GetCustomers')
  return response.data
}

export const createCustomer = async (request: SaveCustomerRequest) => {
  const response = await apiClient.post<CustomerDto>('/Customer/CreateCustomer', request)
  return response.data
}

export const updateCustomer = async (request: CustomerDto) => {
  const response = await apiClient.post<CustomerDto>('/Customer/UpdateCustomer', request)
  return response.data
}

export const getWorkLogUsers = async (filter?: WorkLogUserFilter) => {
  const response = await apiClient.get<WorkLogUserDto[]>('/WorkLogUser/GetUsers', { params: filter })
  return response.data
}

export const findWorkLogUserByEmployeeId = (users: WorkLogUserDto[], employeeId: string) =>
  users.find((user) => user.userType === 'Employee' && user.employeeId === employeeId) ?? null

export const findWorkLogUsersByCustomerId = (users: WorkLogUserDto[], customerId: string) =>
  users.filter((user) => user.userType === 'Customer' && user.customerId === customerId)

export const createWorkLogUser = async (request: CreateWorkLogUserRequest) => {
  const response = await apiClient.post<WorkLogUserDto>('/WorkLogUser/CreateUser', request)
  return response.data
}

export const updateWorkLogUser = async (request: UpdateWorkLogUserRequest) => {
  const response = await apiClient.post<WorkLogUserDto>('/WorkLogUser/UpdateUser', request)
  return response.data
}
