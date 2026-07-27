// Shared domain type definitions for DevTracker.
// These interfaces describe the shapes returned by the backend API and are
// consumed across the frontend via `import type { ... }`.
// (This file previously also contained mock seed data, which has been removed.)

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
  sitCompletedDate?: string
  codeReviewDate?: string
  uatDate?: string
  uatCompletedDate?: string
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
  unitTestDocId?: number | null
  unitTestDocName?: string | null
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
  changesRequested?: boolean
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
  resolvedDate?: string
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
