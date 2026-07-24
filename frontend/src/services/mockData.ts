export interface User {
  id: number
  username: string
  fullName: string
  email: string
  roles: string[]
  status?: string
  mfaEnabled?: boolean
  avatar?: string
  theme?: string
  mustChangePassword?: boolean
}

export interface TaskType {
  id: number
  name: string
  description: string
}

export interface WorkflowStep {
  id: number
  stepName: string
  stepType: "TASK" | "TESTING" | "CODE_REVIEW"
  sequence: number
}

export interface Workflow {
  id: number
  name: string
  type: "TASK" | "BUG"
  steps: WorkflowStep[]
}

export interface Task {
  id: number
  jtrackId: string
  title: string
  description: string
  type: TaskType
  branchName?: string
  assignedDeveloper?: User
  createdBy: User
  devStartDate?: string
  expectedSitDeploymentDate?: string
  expectedUatDeploymentDate?: string
  sitDate?: string
  uatDate?: string
  preprodDate?: string
  productionDate?: string
  status: string
  priority: "High" | "Medium" | "Low"
  efforts: number
  pds?: string // Deployment remarks/completion remarks
  gitLinks?: string
  codeReviewComments?: string
  codeReviewer?: User
  remarks?: string
  brdDocumentId?: number | null
  createdDate: string
  updatedDate: string
  workflow?: Workflow
  tester?: User
  isInPool: boolean
  inPoolDate?: string
  // Multiple developer tracking details as required by prompt
  developers?: {
    developer: User
    branchName: string
    branchCreatedDate: string
    devStartDate: string
    devEndDate?: string
    prLink?: string
    commitId?: string
    remarks?: string
    progress: number // Percentage
  }[]
  sprintId?: number | null
  screenshotUrl?: string
  screenshotName?: string
  unitTestDocUrl?: string
  unitTestDocName?: string
  testingStartedDate?: string
  testingCompletedDate?: string
  testingDuration?: string
  testingComments?: string
  totalBugsRaised?: number
  totalRetests?: number
  reassignmentReason?: string
  reassignedBy?: User
  reassignmentDate?: string
  module?: string
  project?: string
  isQualityRisk?: boolean
  previousTester?: User
}

export interface BugArtifact {
  id: number
  bugId: number
  fileName: string
  fileSize?: string
  fileType?: string
  uploadedBy: User
  uploadedOn: string
}

export interface Bug {
  id: number
  jtrackId: string
  bugTaskId?: number
  crTaskId?: number
  bugTask?: Task
  title: string
  description: string
  reason?: string
  stepsToReproduce?: string
  expectedResult?: string
  actualResult?: string
  raisedBy: User
  assignedDeveloper?: User
  priority: "High" | "Medium" | "Low"
  severity: "Critical" | "High" | "Medium" | "Low"
  status: string
  remarks?: string
  createdDate: string
  updatedDate: string
  resolvedOn?: string
  workflow?: Workflow
  tester?: User
  isInPool: boolean
  inPoolDate?: string
  screenshotUrl?: string
  logData?: string
  videoUrl?: string
  artifacts?: BugArtifact[]
}

export interface TestCase {
  id: number
  testCaseTaskId: number
  title: string
  description: string
  steps: string
  expectedResult: string
  status?: "PASS" | "FAIL" | "PENDING"
  createdById: number
  createdDate: string
}

export interface Comment {
  id: number
  entityType: "TASK" | "BUG"
  entityId: number
  text: string
  user: User
  createdDate: string
}

export interface AuditLog {
  id: number
  entityType: "TASK" | "BUG" | "BUG_TASK"
  entityId: number
  fieldName: string
  oldValue: string
  newValue: string
  remarks?: string
  changedBy: User
  changedDate: string
}

export interface AppConfig {
  id: number
  configKey: string
  configValue: string
  description: string
}

export interface Notification {
  id: number
  userId: number
  title: string
  desc: string
  time: string
  unread: boolean
}

// ----------------- SEED DATA -----------------

export const mockUsers: User[] = [
  { id: 1, username: "developer", fullName: "John Developer", email: "developer@devtracker.com", roles: ["DEVELOPER"] },
  { id: 2, username: "sarah_dev", fullName: "Sarah Jenkins", email: "sarah@devtracker.com", roles: ["DEVELOPER"] },
  { id: 3, username: "tester", fullName: "Mike Tester", email: "tester@devtracker.com", roles: ["TESTER"] },
  { id: 4, username: "qa_manager", fullName: "David QA Lead", email: "qa@devtracker.com", roles: ["TESTADMIN", "TESTER"] },
  { id: 5, username: "reviewer", fullName: "Alice Code Reviewer", email: "reviewer@devtracker.com", roles: ["CODEREVIEWER"] },
  { id: 6, username: "admin", fullName: "Admin Chief", email: "admin@devtracker.com", roles: ["DEVADMIN", "CODEREVIEWER"] },
]

export const mockTaskTypes: TaskType[] = [
  { id: 1, name: "CR", description: "Change Request" },
  { id: 2, name: "SR", description: "Service Request" },
  { id: 3, name: "FIX", description: "Bug Fix" },
  { id: 4, name: "NEW_REQ", description: "New Requirement" },
]

export const mockWorkflows: Workflow[] = [
  {
    id: 1,
    name: "Standard Dev Workflow",
    type: "TASK",
    steps: [
      { id: 1, stepName: "OPEN", stepType: "TASK", sequence: 1 },
      { id: 2, stepName: "IN_PROGRESS", stepType: "TASK", sequence: 2 },
      { id: 3, stepName: "SIT_DEPLOYED", stepType: "TASK", sequence: 3 },
      { id: 4, stepName: "SIT_TESTING", stepType: "TESTING", sequence: 4 },
      { id: 5, stepName: "SIT_COMPLETED", stepType: "TASK", sequence: 5 },
      { id: 6, stepName: "CODE_REVIEW", stepType: "CODE_REVIEW", sequence: 6 },
      { id: 7, stepName: "CODE_REVIEW_DONE", stepType: "TASK", sequence: 7 },
      { id: 8, stepName: "MOVE_TO_UAT", stepType: "TASK", sequence: 8 },
      { id: 9, stepName: "UAT_TESTING", stepType: "TESTING", sequence: 9 },
      { id: 10, stepName: "UAT_COMPLETED", stepType: "TASK", sequence: 10 },
      { id: 11, stepName: "PROD_DEPLOYED", stepType: "TASK", sequence: 11 },
      { id: 12, stepName: "PROD_COMPLETED", stepType: "TASK", sequence: 12 },
      { id: 13, stepName: "CLOSED", stepType: "TASK", sequence: 13 },
    ]
  },
  {
    id: 2,
    name: "Bug Resolution Workflow",
    type: "BUG",
    steps: [
      { id: 101, stepName: "OPEN", stepType: "TASK", sequence: 1 },
      { id: 102, stepName: "IN_PROGRESS", stepType: "TASK", sequence: 2 },
      { id: 103, stepName: "RESOLVED", stepType: "TASK", sequence: 3 },
      { id: 104, stepName: "VERIFIED", stepType: "TESTING", sequence: 4 },
      { id: 105, stepName: "CLOSED", stepType: "TASK", sequence: 5 },
    ]
  }
]

export const mockConfigs: AppConfig[] = [
  { id: 1, configKey: "STATUS_PUSHED_FOR_UAT", configValue: "UAT_TESTING", description: "Status that pushes task for testing bucket" },
  { id: 2, configKey: "STATUS_UAT_COMPLETED", configValue: "UAT_COMPLETED", description: "Status when UAT is approved" },
  { id: 3, configKey: "STATUS_REJECTED", configValue: "IN_PROGRESS", description: "Status when UAT is rejected" },
  { id: 4, configKey: "STATUS_SIT_DEPLOYED", configValue: "SIT_COMPLETED", description: "Status for SIT deployment section" },
  { id: 5, configKey: "STATUS_UAT_DEPLOYED", configValue: "UAT_COMPLETED", description: "Status for UAT deployment section" },
  { id: 6, configKey: "STATUS_PROD_READY", configValue: "CLOSED", description: "Status for Prod deployment section" },
  { id: 7, configKey: "STATUS_CODE_REVIEW", configValue: "CODE_REVIEW", description: "Status for code review bucket" },
  { id: 8, configKey: "STATUS_PUSHED_FOR_SIT", configValue: "SIT_TESTING", description: "Status that pushes task for SIT testing bucket" },
  { id: 9, configKey: "STATUS_SIT_COMPLETED", configValue: "SIT_COMPLETED", description: "Status when SIT is approved" },
  { id: 10, configKey: "SIT_APPROVAL_REQUIRED", configValue: "true", description: "Flag to enable/disable SIT testing requirement" },
  { id: 11, configKey: "UAT_APPROVAL_REQUIRED", configValue: "true", description: "Flag to enable/disable UAT testing requirement" },
]

export const mockTasks: Task[] = [
  {
    id: 1,
    jtrackId: "DT-101",
    title: "Implement API Rate Limiter",
    description: "Build a sliding window rate limiter at the gateway level to limit requests to 100/min per token.",
    type: mockTaskTypes[0], // CR
    status: "OPEN",
    priority: "High",
    efforts: 8.0,
    createdBy: mockUsers[5], // admin
    createdDate: "2026-06-15T09:00:00Z",
    updatedDate: "2026-06-15T09:00:00Z",
    workflow: mockWorkflows[0],
    isInPool: false,
    developers: [
      {
        developer: mockUsers[0], // John
        branchName: "feature/dt-101-rate-limiter",
        branchCreatedDate: "2026-06-15",
        devStartDate: "2026-06-16",
        progress: 20,
        remarks: "Analyzing token bucket vs sliding window algorithms."
      }
    ]
  },
  {
    id: 2,
    jtrackId: "DT-102",
    title: "Database Migration to MySQL 8.0",
    description: "Upgrade dev/staging databases to MySQL 8.0 to utilize improved CTE and JSON functions.",
    type: mockTaskTypes[3], // NEW_REQ
    status: "IN_PROGRESS",
    priority: "High",
    efforts: 16.0,
    assignedDeveloper: mockUsers[0], // John
    createdBy: mockUsers[5],
    devStartDate: "2026-06-10",
    createdDate: "2026-06-10T10:00:00Z",
    updatedDate: "2026-06-18T14:30:00Z",
    workflow: mockWorkflows[0],
    isInPool: false,
    developers: [
      {
        developer: mockUsers[0],
        branchName: "migration/mysql8-upgrade",
        branchCreatedDate: "2026-06-10",
        devStartDate: "2026-06-11",
        progress: 65,
        remarks: "Testing schema backups on local instance."
      },
      {
        developer: mockUsers[1], // Sarah
        branchName: "migration/mysql8-indexing",
        branchCreatedDate: "2026-06-12",
        devStartDate: "2026-06-12",
        progress: 80,
        remarks: "Auditing index performance changes."
      }
    ]
  },
  {
    id: 3,
    jtrackId: "DT-103",
    title: "OAuth2 Provider Integration",
    description: "Allow developers and clients to log in via Keycloak Single Sign-On.",
    type: mockTaskTypes[0],
    status: "SIT_DEPLOYED",
    priority: "Medium",
    efforts: 12.0,
    assignedDeveloper: mockUsers[1], // Sarah
    createdBy: mockUsers[5],
    devStartDate: "2026-06-08",
    sitDate: "2026-06-18",
    createdDate: "2026-06-05T11:00:00Z",
    updatedDate: "2026-06-18T16:00:00Z",
    workflow: mockWorkflows[0],
    isInPool: false,
    branchName: "feature/oauth2-keycloak",
    gitLinks: "https://github.com/enterprise/devtracker/pull/45",
    developers: [
      {
        developer: mockUsers[1],
        branchName: "feature/oauth2-keycloak",
        branchCreatedDate: "2026-06-05",
        devStartDate: "2026-06-08",
        devEndDate: "2026-06-17",
        prLink: "https://github.com/enterprise/devtracker/pull/45",
        commitId: "a4f89d3c",
        remarks: "Redirect URIs successfully mapped for SIT/UAT.",
        progress: 100
      }
    ]
  },
  {
    id: 4,
    jtrackId: "DT-104",
    title: "Memory Leak in Audit Logger",
    description: "Resolve Heap memory accumulation caused by unclosed DB stream references in audit filter.",
    type: mockTaskTypes[2], // FIX
    status: "CODE_REVIEW",
    priority: "High",
    efforts: 4.0,
    assignedDeveloper: mockUsers[0], // John
    createdBy: mockUsers[5],
    devStartDate: "2026-06-18",
    createdDate: "2026-06-17T09:15:00Z",
    updatedDate: "2026-06-20T12:00:00Z",
    workflow: mockWorkflows[0],
    isInPool: false,
    branchName: "bugfix/audit-stream-leak",
    gitLinks: "https://github.com/enterprise/devtracker/pull/62",
    developers: [
      {
        developer: mockUsers[0],
        branchName: "bugfix/audit-stream-leak",
        branchCreatedDate: "2026-06-18",
        devStartDate: "2026-06-18",
        devEndDate: "2026-06-20",
        prLink: "https://github.com/enterprise/devtracker/pull/62",
        commitId: "e99f123b",
        remarks: "Wrapped db streams inside try-with-resources.",
        progress: 100
      }
    ]
  },
  {
    id: 5,
    jtrackId: "DT-105",
    title: "UAT Testing for Dashboard Widgets",
    description: "Verify that charts and metrics reload automatically when new tasks are assigned.",
    type: mockTaskTypes[1], // SR
    status: "UAT_TESTING",
    priority: "Medium",
    efforts: 6.0,
    assignedDeveloper: mockUsers[1],
    createdBy: mockUsers[4], // qa_manager
    tester: mockUsers[2], // tester
    devStartDate: "2026-06-10",
    sitDate: "2026-06-14",
    uatDate: "2026-06-19",
    createdDate: "2026-06-08T08:00:00Z",
    updatedDate: "2026-06-19T10:00:00Z",
    workflow: mockWorkflows[0],
    isInPool: false,
    branchName: "feature/realtime-widgets",
    developers: [
      {
        developer: mockUsers[1],
        branchName: "feature/realtime-widgets",
        branchCreatedDate: "2026-06-08",
        devStartDate: "2026-06-10",
        devEndDate: "2026-06-13",
        prLink: "https://github.com/enterprise/devtracker/pull/50",
        commitId: "cd33f44e",
        progress: 100
      }
    ]
  },
  {
    id: 6,
    jtrackId: "DT-106",
    title: "Export Metrics Report PDF/Excel",
    description: "Allow Project Admins and Managers to export system throughput reports.",
    type: mockTaskTypes[0],
    status: "CLOSED",
    priority: "High",
    efforts: 10.0,
    assignedDeveloper: mockUsers[1],
    createdBy: mockUsers[5],
    devStartDate: "2026-06-01",
    sitDate: "2026-06-05",
    uatDate: "2026-06-10",
    productionDate: "2026-06-15",
    createdDate: "2026-06-01T10:00:00Z",
    updatedDate: "2026-06-15T18:00:00Z",
    workflow: mockWorkflows[0],
    isInPool: false,
    branchName: "feature/metrics-exporter",
    gitLinks: "https://github.com/enterprise/devtracker/pull/31",
    developers: [
      {
        developer: mockUsers[1],
        branchName: "feature/metrics-exporter",
        branchCreatedDate: "2026-06-01",
        devStartDate: "2026-06-01",
        devEndDate: "2026-06-04",
        prLink: "https://github.com/enterprise/devtracker/pull/31",
        commitId: "bc78ad99",
        progress: 100
      }
    ]
  }
]

export const mockBugs: Bug[] = [
  {
    id: 1,
    jtrackId: "BUG-201",
    title: "Token Expiration Mismatch",
    description: "JWT expires in 15 minutes instead of the configured 24 hours, prompting frequent logouts.",
    raisedBy: mockUsers[2], // tester
    assignedDeveloper: mockUsers[0], // John
    priority: "High",
    severity: "Critical",
    status: "OPEN",
    createdDate: "2026-06-20T10:00:00Z",
    updatedDate: "2026-06-20T10:00:00Z",
    workflow: mockWorkflows[1],
    isInPool: false
  },
  {
    id: 2,
    jtrackId: "BUG-202",
    title: "Sidebar overlap on mobile Safari",
    description: "In iPhone 13, the navigation sidebar remains locked over main content and cannot be closed.",
    raisedBy: mockUsers[3], // qa_manager
    assignedDeveloper: mockUsers[1], // Sarah
    priority: "Medium",
    severity: "High",
    status: "IN_PROGRESS",
    createdDate: "2026-06-20T11:00:00Z",
    updatedDate: "2026-06-21T09:00:00Z",
    workflow: mockWorkflows[1],
    isInPool: false
  },
  {
    id: 3,
    jtrackId: "BUG-203",
    title: "Validation error on user registration",
    description: "Password patterns are rejecting special characters like '!' or '@' even though policy specifies them as allowed.",
    raisedBy: mockUsers[2],
    assignedDeveloper: mockUsers[0],
    priority: "Low",
    severity: "Medium",
    status: "RESOLVED",
    createdDate: "2026-06-18T14:00:00Z",
    updatedDate: "2026-06-20T16:00:00Z",
    workflow: mockWorkflows[1],
    isInPool: false
  }
]

export const mockTestCases: TestCase[] = [
  {
    id: 1,
    testCaseTaskId: 1,
    title: "Validate rate limiting trigger",
    description: "Execute 105 quick API calls to verify response code.",
    steps: "1. Log in to dashboard\n2. Trigger script calling /api/tasks 105 times in 5 seconds\n3. Inspect response payload of 101st request",
    expectedResult: "101st request returns HTTP 429 Rate Limit Exceeded",
    status: "PENDING",
    createdById: 4,
    createdDate: "2026-06-20"
  },
  {
    id: 2,
    testCaseTaskId: 1,
    title: "Validate session persistence",
    description: "Verify login persists when tab is closed.",
    steps: "1. Log in\n2. Close browser tab\n3. Reopen tab to /dashboard",
    expectedResult: "Dashboard loads immediately without auth redirection",
    status: "PASS",
    createdById: 4,
    createdDate: "2026-06-20"
  }
]

export const mockComments: Comment[] = [
  {
    id: 1,
    entityType: "TASK",
    entityId: 1,
    text: "Analyzing token bucket filters. I think a memory-mapped Redis solution would be optimal for Spring Boot backend integration.",
    user: mockUsers[0], // John
    createdDate: "2026-06-16T10:00:00Z"
  },
  {
    id: 2,
    entityType: "TASK",
    entityId: 4,
    text: "Confirmed stream leak. The FileInputStream on line 142 wasn't wrapped in a finally block.",
    user: mockUsers[0],
    createdDate: "2026-06-18T18:00:00Z"
  },
  {
    id: 3,
    entityType: "BUG",
    entityId: 1,
    text: "Testing JWT expiration on my local branch now.",
    user: mockUsers[0],
    createdDate: "2026-06-20T12:00:00Z"
  }
]

export const mockAuditLogs: AuditLog[] = [
  {
    id: 1,
    entityType: "TASK",
    entityId: 2,
    fieldName: "status",
    oldValue: "OPEN",
    newValue: "IN_PROGRESS",
    remarks: "Migration script tests passed on docker sandbox.",
    changedBy: mockUsers[0],
    changedDate: "2026-06-11T10:00:00Z"
  },
  {
    id: 2,
    entityType: "TASK",
    entityId: 4,
    fieldName: "status",
    oldValue: "SIT_COMPLETED",
    newValue: "CODE_REVIEW",
    remarks: "Pushed changes and raised PR #62. Requesting review.",
    changedBy: mockUsers[0],
    changedDate: "2026-06-20T12:00:00Z"
  }
]
