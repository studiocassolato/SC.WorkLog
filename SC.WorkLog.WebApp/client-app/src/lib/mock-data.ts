// Mock Data for WorkLog Application

export type EmployeeLevel = 'Junior' | 'Mid' | 'Senior'
export type PaymentType = 'Time & material' | 'Fixed price' | 'Annual retainer' | 'Internal'
export type ProjectStatus = 'Active' | 'Suspended' | 'Closed'
export type WorkItemStatus = 'Open' | 'In progress' | 'On hold' | 'Completed' | 'Closed'
export type WorkItemPriority = 'Low' | 'Normal' | 'High' | 'Urgent'
export type RequestStatus = 'Pending approval' | 'Approved' | 'Rejected'
export type LeaveType = 'Vacation' | 'Permission'

export interface StatusConfig {
  id: string
  name: WorkItemStatus
  displayName: string // name shown to customers
  isClosed: boolean
  isInitial: boolean
  order: number
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  level: EmployeeLevel
  defaultHourlyRate: number
  expectedDailyHours: number
  active: boolean
}

export interface Customer {
  id: string
  companyName: string
  companyDomain?: string // e.g., "videndum.com" for client login
  contactPerson: string
  contactEmail: string
  contactPhone?: string
  active: boolean
}

export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  date: string
}

export interface Project {
  id: string
  customerId: string
  name: string
  paymentType: PaymentType
  status: ProjectStatus
  notes: string
  active?: boolean
  // Time & material rates
  juniorRate?: number
  midRate?: number
  seniorRate?: number
  // Fixed price
  fixedAmount?: number
  // Annual retainer - amount is managed via contract periods
  annualAmount?: number
  milestones: ProjectMilestone[]
  createdAt?: string
}

export interface ProjectPayment {
  id: string
  projectId: string
  paymentDate: string
  amount: number
  note: string
  createdOn: string
  createdBy: string
}

export interface ProjectContractPeriod {
  id: string
  projectId: string
  startDate: string
  endDate: string
  amount: number
  paymentDate?: string
  note: string
  createdOn: string
  createdBy: string
}

export interface WorkItem {
  id: string
  code?: string
  projectId: string
  title: string
  description: string
  status: WorkItemStatus
  priority: WorkItemPriority
  assigneeId: string | null
  origin: 'Manual' | 'Jira' | 'Azure DevOps' | 'Email'
  externalReference: string | null
  openingDate: string
  closingDate: string | null
  isPriority?: boolean // marked as priority for assignee
}

export interface WorkItemComment {
  id: string
  workItemId: string
  employeeId: string
  content: string
  isInternal: boolean
  createdAt: string
}

export interface TimeEntry {
  id: string
  employeeId: string
  workItemId: string
  date: string
  time: number // hours logged by employee
  approvedTime: number // hours approved by admin (for billing)
  description: string
  notes?: string
  status?: RequestStatus
  adminNote: string | null
  // Snapshot data at time of entry
  employeeLevelSnapshot: EmployeeLevel
  defaultRateSnapshot: number
  projectRateSnapshot: number
}

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  date: string
  hours: number
  status: RequestStatus
  requestDate: string
  employeeNote: string
  adminNote: string | null
}

export interface OvertimeRequest {
  id: string
  employeeId: string
  date: string
  calculatedHours: number
  approvedHours: number
  status: RequestStatus
}

// Mock Employees
export const employees: Employee[] = [
  {
    id: 'emp-1',
    firstName: 'Nicola',
    lastName: 'Cassolato',
    email: 'nicola@studiocassolato.it',
    level: 'Senior',
    defaultHourlyRate: 85,
    expectedDailyHours: 8,
    active: true,
  },
  {
    id: 'emp-2',
    firstName: 'Luca',
    lastName: 'Bianchi',
    email: 'luca@studiocassolato.it',
    level: 'Mid',
    defaultHourlyRate: 63,
    expectedDailyHours: 8,
    active: true,
  },
  {
    id: 'emp-3',
    firstName: 'Marta',
    lastName: 'Verdi',
    email: 'marta@studiocassolato.it',
    level: 'Senior',
    defaultHourlyRate: 78,
    expectedDailyHours: 8,
    active: true,
  },
  {
    id: 'emp-4',
    firstName: 'Giulia',
    lastName: 'Neri',
    email: 'giulia@studiocassolato.it',
    level: 'Junior',
    defaultHourlyRate: 42,
    expectedDailyHours: 8,
    active: true,
  },
  {
    id: 'emp-5',
    firstName: 'Paolo',
    lastName: 'Rossi',
    email: 'paolo@studiocassolato.it',
    level: 'Mid',
    defaultHourlyRate: 60,
    expectedDailyHours: 8,
    active: true,
  },
]

// Mock Status Configuration
export const statusConfigs: StatusConfig[] = [
  { id: 'status-1', name: 'Open', displayName: 'New', isClosed: false, isInitial: true, order: 1 },
  { id: 'status-2', name: 'In progress', displayName: 'In Progress', isClosed: false, isInitial: false, order: 2 },
  { id: 'status-3', name: 'On hold', displayName: 'On Hold', isClosed: false, isInitial: false, order: 3 },
  { id: 'status-4', name: 'Completed', displayName: 'Completed', isClosed: true, isInitial: false, order: 4 },
  { id: 'status-5', name: 'Closed', displayName: 'Closed', isClosed: true, isInitial: false, order: 5 },
]

// Mock Customers
export const customers: Customer[] = [
  {
    id: 'cust-1',
    companyName: 'Athena S.p.A.',
    companyDomain: 'athena.it',
    contactPerson: 'Marco Benedetti',
    contactEmail: 'marco.benedetti@athena.it',
    active: true,
  },
  {
    id: 'cust-2',
    companyName: 'Passione Beauty',
    companyDomain: 'passionebeauty.it',
    contactPerson: 'Laura Fontana',
    contactEmail: 'laura.fontana@passionebeauty.it',
    active: true,
  },
  {
    id: 'cust-3',
    companyName: 'Videndum Media Solutions',
    companyDomain: 'videndum.com',
    contactPerson: 'Andrea Colombo',
    contactEmail: 'andrea.colombo@videndum.com',
    active: true,
  },
  {
    id: 'cust-4',
    companyName: 'Euroedile',
    companyDomain: 'euroedile.it',
    contactPerson: 'Francesco Ricci',
    contactEmail: 'francesco.ricci@euroedile.it',
    active: true,
  },
  {
    id: 'cust-5',
    companyName: 'Studio Cassolato Internal',
    contactPerson: 'Nicola Cassolato',
    contactEmail: 'nicola@studiocassolato.it',
    active: true,
  },
]

// Mock Projects
export const projects: Project[] = [
  {
    id: 'proj-1',
    customerId: 'cust-1',
    name: 'PimUp Support',
    paymentType: 'Time & material',
    status: 'Active',
    notes: 'Ongoing support and development for PimUp platform',
    juniorRate: 50,
    midRate: 70,
    seniorRate: 90,
    milestones: [
      { id: 'ms-1', projectId: 'proj-1', title: 'Q1 Review', date: '2024-03-31' },
      { id: 'ms-2', projectId: 'proj-1', title: 'Q2 Review', date: '2024-06-30' },
    ],
    createdAt: '2023-01-01',
  },
  {
    id: 'proj-2',
    customerId: 'cust-2',
    name: 'DataFlow Import',
    paymentType: 'Fixed price',
    status: 'Active',
    notes: 'Data import and migration project',
    fixedAmount: 10000,
    milestones: [
      { id: 'ms-3', projectId: 'proj-2', title: 'Phase 1 Complete', date: '2024-02-15' },
      { id: 'ms-4', projectId: 'proj-2', title: 'Final Delivery', date: '2024-04-30' },
    ],
    createdAt: '2024-01-15',
  },
  {
    id: 'proj-3',
    customerId: 'cust-3',
    name: 'Annual Support',
    paymentType: 'Annual retainer',
    status: 'Active',
    notes: 'Annual technical support contract',
    annualAmount: 24000,
    milestones: [],
    createdAt: '2023-12-01',
  },
  {
    id: 'proj-4',
    customerId: 'cust-5',
    name: 'WorkLog Development',
    paymentType: 'Internal',
    status: 'Active',
    notes: 'Internal time tracking application development',
    milestones: [
      { id: 'ms-5', projectId: 'proj-4', title: 'MVP Release', date: '2024-03-01' },
    ],
    createdAt: '2024-02-01',
  },
  {
    id: 'proj-5',
    customerId: 'cust-4',
    name: 'Website Redesign',
    paymentType: 'Fixed price',
    status: 'Closed',
    notes: 'Complete website redesign project',
    fixedAmount: 15000,
    milestones: [],
    createdAt: '2023-06-01',
  },
]

// Mock Project Payments (for Time & material projects)
export const projectPayments: ProjectPayment[] = [
  {
    id: 'pay-1',
    projectId: 'proj-1',
    paymentDate: '2024-01-15',
    amount: 5000,
    note: 'Initial advance payment',
    createdOn: '2024-01-15',
    createdBy: 'emp-1',
  },
  {
    id: 'pay-2',
    projectId: 'proj-1',
    paymentDate: '2024-02-15',
    amount: 3000,
    note: 'February payment',
    createdOn: '2024-02-15',
    createdBy: 'emp-1',
  },
  {
    id: 'pay-3',
    projectId: 'proj-1',
    paymentDate: '2024-03-15',
    amount: 4000,
    note: 'March payment',
    createdOn: '2024-03-15',
    createdBy: 'emp-1',
  },
]

// Mock Contract Periods (for Annual retainer projects)
export const projectContractPeriods: ProjectContractPeriod[] = [
  {
    id: 'cp-1',
    projectId: 'proj-3',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    amount: 24000,
    paymentDate: '2024-01-10',
    note: '2024 Annual Support Contract',
    createdOn: '2023-12-15',
    createdBy: 'emp-1',
  },
  {
    id: 'cp-2',
    projectId: 'proj-3',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    amount: 28000,
    paymentDate: '2025-01-05',
    note: '2025 Annual Support Contract - Expanded scope',
    createdOn: '2024-12-10',
    createdBy: 'emp-1',
  },
  {
    id: 'cp-3',
    projectId: 'proj-3',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    amount: 30000,
    note: '2026 Annual Support Contract',
    createdOn: '2025-12-15',
    createdBy: 'emp-1',
  },
]

// Helper to get dates relative to today
const today = new Date()
const formatDate = (date: Date) => date.toISOString().split('T')[0]
const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Mock Work Items
export const workItems: WorkItem[] = [
  {
    id: 'wi-1',
    code: 'ATHENA-1234',
    projectId: 'proj-1',
    title: 'Product import error analysis',
    description: 'Investigate and fix product import failures from external sources',
    status: 'In progress',
    priority: 'High',
    assigneeId: 'emp-1',
    origin: 'Jira',
    externalReference: 'ATH-1234',
    openingDate: formatDate(addDays(today, -10)),
    closingDate: null,
    isPriority: true,
  },
  {
    id: 'wi-2',
    code: 'ATHENA-1235',
    projectId: 'proj-1',
    title: 'Magento attribute migration',
    description: 'Migrate product attributes to new Magento structure',
    status: 'Open',
    priority: 'Normal',
    assigneeId: 'emp-2',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -5)),
    closingDate: null,
  },
  {
    id: 'wi-3',
    code: 'ATHENA-1236',
    projectId: 'proj-1',
    title: 'Product Health dashboard configuration',
    description: 'Configure and customize the product health monitoring dashboard',
    status: 'In progress',
    priority: 'Normal',
    assigneeId: 'emp-3',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -7)),
    closingDate: null,
  },
  {
    id: 'wi-4',
    code: 'SUPPORT-5341',
    projectId: 'proj-2',
    title: 'Image synchronization bug',
    description: 'Fix image sync issues between PIM and e-commerce platform',
    status: 'Open',
    priority: 'Urgent',
    assigneeId: null,
    origin: 'Email',
    externalReference: null,
    openingDate: formatDate(addDays(today, -2)),
    closingDate: null,
  },
  {
    id: 'wi-5',
    code: 'SUPPORT-5340',
    projectId: 'proj-2',
    title: 'Staging environment setup',
    description: 'Set up and configure staging environment for testing',
    status: 'Completed',
    priority: 'Normal',
    assigneeId: 'emp-4',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -15)),
    closingDate: formatDate(addDays(today, -3)),
  },
  {
    id: 'wi-6',
    code: 'VID-101',
    projectId: 'proj-3',
    title: 'Project progress meeting',
    description: 'Weekly sync meeting with Videndum team',
    status: 'Open',
    priority: 'Low',
    assigneeId: 'emp-1',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(today),
    closingDate: null,
  },
  {
    id: 'wi-7',
    code: 'INT-001',
    projectId: 'proj-4',
    title: 'Internal AI Optimize training',
    description: 'Team training session on AI optimization tools',
    status: 'In progress',
    priority: 'Normal',
    assigneeId: 'emp-1',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -3)),
    closingDate: null,
    isPriority: true,
  },
  {
    id: 'wi-8',
    code: 'ATHENA-1567',
    projectId: 'proj-1',
    title: 'MongoDB performance review',
    description: 'Review and optimize MongoDB queries for better performance',
    status: 'On hold',
    priority: 'Normal',
    assigneeId: 'emp-5',
    origin: 'Jira',
    externalReference: 'ATH-1567',
    openingDate: formatDate(addDays(today, -20)),
    closingDate: null,
  },
  {
    id: 'wi-9',
    code: 'VID-102',
    projectId: 'proj-3',
    title: 'Generic customer support',
    description: 'General support requests and troubleshooting',
    status: 'Open',
    priority: 'Normal',
    assigneeId: null,
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -1)),
    closingDate: null,
  },
  {
    id: 'wi-10',
    code: 'SUPPORT-5342',
    projectId: 'proj-2',
    title: 'Production release testing',
    description: 'Final testing before production deployment',
    status: 'In progress',
    priority: 'High',
    assigneeId: 'emp-2',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -4)),
    closingDate: null,
  },
  {
    id: 'wi-11',
    code: 'DIG-001',
    projectId: 'proj-5',
    title: 'Homepage redesign',
    description: 'Complete redesign of the homepage layout',
    status: 'Closed',
    priority: 'Normal',
    assigneeId: 'emp-3',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -60)),
    closingDate: formatDate(addDays(today, -30)),
  },
  {
    id: 'wi-12',
    code: 'INT-002',
    projectId: 'proj-4',
    title: 'Time entry validation',
    description: 'Implement validation rules for time entries',
    status: 'Open',
    priority: 'Normal',
    assigneeId: 'emp-4',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -1)),
    closingDate: null,
  },
  {
    id: 'wi-13',
    code: 'ATHENA-1890',
    projectId: 'proj-1',
    title: 'API rate limiting implementation',
    description: 'Implement rate limiting for external API calls',
    status: 'Open',
    priority: 'Low',
    assigneeId: null,
    origin: 'Jira',
    externalReference: 'ATH-1890',
    openingDate: formatDate(today),
    closingDate: null,
  },
  {
    id: 'wi-14',
    code: 'INT-003',
    projectId: 'proj-4',
    title: 'Dashboard analytics',
    description: 'Build analytics dashboard with KPIs',
    status: 'In progress',
    priority: 'High',
    assigneeId: 'emp-1',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -8)),
    closingDate: null,
  },
  {
    id: 'wi-15',
    code: 'VID-103',
    projectId: 'proj-3',
    title: 'Documentation update',
    description: 'Update technical documentation for client',
    status: 'Open',
    priority: 'Low',
    assigneeId: 'emp-5',
    origin: 'Manual',
    externalReference: null,
    openingDate: formatDate(addDays(today, -2)),
    closingDate: null,
  },
]

// Mock Work Item Comments
export const workItemComments: WorkItemComment[] = [
  {
    id: 'wic-1',
    workItemId: 'wi-1',
    employeeId: 'emp-1',
    content: 'Initial analysis shows the import failures are related to malformed product data from the external feed. Need to implement additional validation.',
    isInternal: true,
    createdAt: formatDate(addDays(today, -9)) + 'T09:30:00',
  },
  {
    id: 'wic-2',
    workItemId: 'wi-1',
    employeeId: 'emp-2',
    content: 'Added validation layer for incoming data. Testing with sample batches now.',
    isInternal: true,
    createdAt: formatDate(addDays(today, -7)) + 'T14:15:00',
  },
  {
    id: 'wic-3',
    workItemId: 'wi-1',
    employeeId: 'emp-1',
    content: 'We have identified the root cause and are working on a fix. Expected completion by end of week.',
    isInternal: false,
    createdAt: formatDate(addDays(today, -5)) + 'T10:00:00',
  },
  {
    id: 'wic-4',
    workItemId: 'wi-4',
    employeeId: 'emp-3',
    content: 'Image sync issue appears to be related to CDN caching. Investigating further.',
    isInternal: true,
    createdAt: formatDate(addDays(today, -1)) + 'T16:45:00',
  },
  {
    id: 'wic-5',
    workItemId: 'wi-4',
    employeeId: 'emp-1',
    content: 'We are aware of the issue and our team is actively investigating. We will provide an update within 24 hours.',
    isInternal: false,
    createdAt: formatDate(addDays(today, -1)) + 'T17:00:00',
  },
  {
    id: 'wic-6',
    workItemId: 'wi-10',
    employeeId: 'emp-2',
    content: 'All smoke tests passed. Running regression suite now.',
    isInternal: true,
    createdAt: formatDate(addDays(today, -2)) + 'T11:30:00',
  },
]

// Mock Time Entries
export const timeEntries: TimeEntry[] = [
  // Today - Nicola (8h - complete day)
  {
    id: 'te-1',
    employeeId: 'emp-1',
    workItemId: 'wi-1',
    date: formatDate(today),
    time: 4,
    approvedTime: 4,
    description: 'Investigated import failures, identified root cause',
    adminNote: null,
    employeeLevelSnapshot: 'Senior',
    defaultRateSnapshot: 85,
    projectRateSnapshot: 90,
  },
  {
    id: 'te-2',
    employeeId: 'emp-1',
    workItemId: 'wi-7',
    date: formatDate(today),
    time: 2,
    approvedTime: 2,
    description: 'AI training session preparation',
    adminNote: null,
    employeeLevelSnapshot: 'Senior',
    defaultRateSnapshot: 85,
    projectRateSnapshot: 0, // Internal
  },
  {
    id: 'te-3',
    employeeId: 'emp-1',
    workItemId: 'wi-14',
    date: formatDate(today),
    time: 2,
    approvedTime: 1.5,
    description: 'Dashboard development',
    adminNote: 'Reduced to account for meeting time',
    employeeLevelSnapshot: 'Senior',
    defaultRateSnapshot: 85,
    projectRateSnapshot: 0,
  },
  // Today - Luca (9.5h - overtime)
  {
    id: 'te-4',
    employeeId: 'emp-2',
    workItemId: 'wi-2',
    date: formatDate(today),
    time: 5,
    approvedTime: 5,
    description: 'Attribute mapping and migration scripts',
    adminNote: null,
    employeeLevelSnapshot: 'Mid',
    defaultRateSnapshot: 63,
    projectRateSnapshot: 70,
  },
  {
    id: 'te-5',
    employeeId: 'emp-2',
    workItemId: 'wi-10',
    date: formatDate(today),
    time: 4.5,
    approvedTime: 4.5,
    description: 'Release testing and bug fixes',
    adminNote: null,
    employeeLevelSnapshot: 'Mid',
    defaultRateSnapshot: 63,
    projectRateSnapshot: 0, // Fixed price
  },
  // Today - Marta (6h - missing hours)
  {
    id: 'te-6',
    employeeId: 'emp-3',
    workItemId: 'wi-3',
    date: formatDate(today),
    time: 6,
    approvedTime: 6,
    description: 'Dashboard configuration and testing',
    adminNote: null,
    employeeLevelSnapshot: 'Senior',
    defaultRateSnapshot: 78,
    projectRateSnapshot: 90,
  },
  // Today - Giulia
  {
    id: 'te-7',
    employeeId: 'emp-4',
    workItemId: 'wi-12',
    date: formatDate(today),
    time: 8,
    approvedTime: 8,
    description: 'Validation rules implementation',
    adminNote: null,
    employeeLevelSnapshot: 'Junior',
    defaultRateSnapshot: 42,
    projectRateSnapshot: 0,
  },
  // Today - Paolo
  {
    id: 'te-8',
    employeeId: 'emp-5',
    workItemId: 'wi-15',
    date: formatDate(today),
    time: 4,
    approvedTime: 4,
    description: 'Documentation review',
    adminNote: null,
    employeeLevelSnapshot: 'Mid',
    defaultRateSnapshot: 60,
    projectRateSnapshot: 0, // Retainer
  },
  {
    id: 'te-9',
    employeeId: 'emp-5',
    workItemId: 'wi-8',
    date: formatDate(today),
    time: 4,
    approvedTime: 3.5,
    description: 'MongoDB query optimization analysis',
    adminNote: 'Adjusted based on actual progress',
    employeeLevelSnapshot: 'Mid',
    defaultRateSnapshot: 60,
    projectRateSnapshot: 70,
  },
  // Yesterday entries
  {
    id: 'te-10',
    employeeId: 'emp-1',
    workItemId: 'wi-1',
    date: formatDate(addDays(today, -1)),
    time: 8,
    approvedTime: 8,
    description: 'Error analysis and debugging',
    adminNote: null,
    employeeLevelSnapshot: 'Senior',
    defaultRateSnapshot: 85,
    projectRateSnapshot: 90,
  },
  {
    id: 'te-11',
    employeeId: 'emp-2',
    workItemId: 'wi-2',
    date: formatDate(addDays(today, -1)),
    time: 8,
    approvedTime: 8,
    description: 'Attribute migration planning',
    adminNote: null,
    employeeLevelSnapshot: 'Mid',
    defaultRateSnapshot: 63,
    projectRateSnapshot: 70,
  },
  {
    id: 'te-12',
    employeeId: 'emp-3',
    workItemId: 'wi-3',
    date: formatDate(addDays(today, -1)),
    time: 9,
    approvedTime: 9,
    description: 'Dashboard implementation - overtime approved',
    adminNote: 'Urgent deadline, overtime approved',
    employeeLevelSnapshot: 'Senior',
    defaultRateSnapshot: 78,
    projectRateSnapshot: 90,
  },
  // More historical entries
  {
    id: 'te-13',
    employeeId: 'emp-4',
    workItemId: 'wi-5',
    date: formatDate(addDays(today, -2)),
    time: 8,
    approvedTime: 8,
    description: 'Environment configuration',
    adminNote: null,
    employeeLevelSnapshot: 'Junior',
    defaultRateSnapshot: 42,
    projectRateSnapshot: 0,
  },
  {
    id: 'te-14',
    employeeId: 'emp-5',
    workItemId: 'wi-8',
    date: formatDate(addDays(today, -2)),
    time: 8,
    approvedTime: 7,
    description: 'MongoDB research',
    adminNote: 'Some time spent on unrelated issues',
    employeeLevelSnapshot: 'Mid',
    defaultRateSnapshot: 60,
    projectRateSnapshot: 70,
  },
]

// Mock Leave Requests
export const leaveRequests: LeaveRequest[] = [
  {
    id: 'lr-1',
    employeeId: 'emp-2',
    type: 'Vacation',
    date: formatDate(addDays(today, 5)),
    hours: 8,
    status: 'Pending approval',
    requestDate: formatDate(addDays(today, -2)),
    employeeNote: 'Family event',
    adminNote: null,
  },
  {
    id: 'lr-2',
    employeeId: 'emp-3',
    type: 'Permission',
    date: formatDate(addDays(today, -1)),
    hours: 2,
    status: 'Approved',
    requestDate: formatDate(addDays(today, -3)),
    employeeNote: 'Medical appointment',
    adminNote: 'Approved',
  },
  {
    id: 'lr-3',
    employeeId: 'emp-4',
    type: 'Permission',
    date: formatDate(addDays(today, -5)),
    hours: 4,
    status: 'Rejected',
    requestDate: formatDate(addDays(today, -7)),
    employeeNote: 'Personal errand',
    adminNote: 'Too short notice, deadline week',
  },
  {
    id: 'lr-4',
    employeeId: 'emp-1',
    type: 'Vacation',
    date: formatDate(addDays(today, 10)),
    hours: 8,
    status: 'Pending approval',
    requestDate: formatDate(today),
    employeeNote: 'Holiday',
    adminNote: null,
  },
  {
    id: 'lr-5',
    employeeId: 'emp-5',
    type: 'Vacation',
    date: formatDate(addDays(today, 15)),
    hours: 8,
    status: 'Pending approval',
    requestDate: formatDate(addDays(today, -1)),
    employeeNote: 'Travel',
    adminNote: null,
  },
]

// Mock Overtime Requests
export const overtimeRequests: OvertimeRequest[] = [
  {
    id: 'ot-1',
    employeeId: 'emp-2',
    date: formatDate(today),
    calculatedHours: 1.5,
    approvedHours: 0,
    status: 'Pending approval',
  },
  {
    id: 'ot-2',
    employeeId: 'emp-3',
    date: formatDate(addDays(today, -1)),
    calculatedHours: 1,
    approvedHours: 1,
    status: 'Approved',
  },
  {
    id: 'ot-3',
    employeeId: 'emp-5',
    date: formatDate(addDays(today, -7)),
    calculatedHours: 2,
    approvedHours: 0,
    status: 'Rejected',
  },
]

// Helper functions
export function getEmployeeById(id: string) {
  return employees.find((e) => e.id === id)
}

export function getCustomerById(id: string) {
  return customers.find((c) => c.id === id)
}

export function getProjectById(id: string) {
  return projects.find((p) => p.id === id)
}

export function getWorkItemById(id: string) {
  return workItems.find((w) => w.id === id)
}

export function getProjectsByCustomer(customerId: string) {
  return projects.filter((p) => p.customerId === customerId)
}

export function getWorkItemsByProject(projectId: string) {
  return workItems.filter((w) => w.projectId === projectId)
}

export function getTimeEntriesByDate(date: string) {
  return timeEntries.filter((t) => t.date === date)
}

export function getTimeEntriesByEmployee(employeeId: string) {
  return timeEntries.filter((t) => t.employeeId === employeeId)
}

export function getTimeEntriesByWorkItem(workItemId: string) {
  return timeEntries.filter((t) => t.workItemId === workItemId)
}

export function getLeaveRequestsByEmployee(employeeId: string) {
  return leaveRequests.filter((l) => l.employeeId === employeeId)
}

export function calculateDailyHours(employeeId: string, date: string) {
  return timeEntries
    .filter((t) => t.employeeId === employeeId && t.date === date)
    .reduce((sum, t) => sum + t.time, 0)
}

export function calculateDailyApprovedHours(employeeId: string, date: string) {
  return timeEntries
    .filter((t) => t.employeeId === employeeId && t.date === date)
    .reduce((sum, t) => sum + t.approvedTime, 0)
}

export function getWorkItemTotalHours(workItemId: string) {
  return timeEntries
    .filter((t) => t.workItemId === workItemId)
    .reduce((sum, t) => sum + t.time, 0)
}

// Generic work items for settings
export const genericWorkItems = [
  'Internal administration',
  'Training',
  'Customer meeting',
  'Generic support',
  'Internal analysis',
]
