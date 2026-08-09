# GovFlow AI — Database Design

**ORM:** Prisma  
**Database:** PostgreSQL  
**IDs:** UUID (`uuid()` / `@default(uuid())`)  
**Timestamps:** `createdAt`, `updatedAt` on mutable entities; append-only for audit  

> All transactional outcomes are **sandbox/demo**. Schema supports real providers later without structural rewrite.

---

## 1. Entity Overview

| Entity | Purpose |
|--------|---------|
| User | Authenticated account |
| Role / Permission / RolePermission | RBAC |
| UserRole | User ↔ Role |
| Service | Catalog entry (Trade License Renewal, etc.) |
| ServiceRequirement | Required fields/docs per service |
| Transaction | User instance of a service journey |
| TransactionStep | Lifecycle / workflow steps |
| TransactionField | Application field values + source |
| Document | Uploaded or vault-linked file metadata |
| DocumentAnalysis | Classification, extraction, validation |
| AIInsight | User-facing AI explanations / recommendations |
| AIAction | Record of AI agent actions |
| Payment | Sandbox fee breakdown + status |
| Notification | In-app alerts |
| AuditLog | Security/compliance audit trail |
| EmbeddingChunk *(optional Phase 3)* | RAG chunks for service knowledge |

---

## 2. Enums

```prisma
enum UserStatus {
  ACTIVE
  DISABLED
  PENDING
}

enum ServiceCategory {
  BUSINESS
  INDIVIDUAL
  PERMIT
}

enum RequirementType {
  FIELD
  DOCUMENT
  CONSENT
  PAYMENT
}

enum FieldDataType {
  STRING
  NUMBER
  DATE
  BOOLEAN
  ENUM
}

enum FieldSource {
  AI_EXTRACTED
  USER_PROVIDED
  SYSTEM_VERIFIED
}

enum TransactionStatus {
  DRAFT
  IDENTIFIED
  PREPARING
  READY_FOR_REVIEW
  PAYMENT_PENDING
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  ISSUED
  REJECTED
  NEEDS_ACTION
  CANCELLED
}

enum StepStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
  SKIPPED
}

enum DocumentStatus {
  UPLOADED
  ANALYZING
  CLASSIFIED
  VALID
  WARNING
  INVALID
  EXPIRED
  MISSING
}

enum AnalysisStatus {
  PENDING
  COMPLETED
  FAILED
  MOCK
}

enum PaymentStatus {
  DRAFT
  AWAITING_REVIEW
  SANDBOX_PAID
  WAIVED
  FAILED
}

enum InsightType {
  READINESS
  DOCUMENT
  VALIDATION
  MONITORING
  RECOMMENDATION
  INTENT
  FINAL_REVIEW
}

enum AiActionType {
  INTENT_ANALYSIS
  SERVICE_IDENTIFICATION
  REQUIREMENT_CHECK
  DOCUMENT_ANALYSIS
  VALIDATION
  PREPARATION
  FINAL_REVIEW
  MONITORING
  COPILOT_REPLY
}

enum NotificationType {
  INFO
  WARNING
  ACTION_REQUIRED
  SUCCESS
  SYSTEM
}

enum AuditAction {
  DOCUMENT_UPLOADED
  DOCUMENT_ANALYZED
  REQUIREMENT_CHECKED
  TRANSACTION_CREATED
  TRANSACTION_UPDATED
  AI_VALIDATION_PERFORMED
  APPLICATION_PREPARED
  FINAL_REVIEW_COMPLETED
  SANDBOX_SUBMISSION
  PAYMENT_REVIEW_OPENED
  USER_LOGIN
  USER_LOGOUT
  ROLE_CHANGED
}
```

---

## 3. Proposed Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth / RBAC ───────────────────────────────────────────────

model User {
  id           String     @id @default(uuid()) @db.Uuid
  email        String     @unique
  passwordHash String
  fullName     String
  locale       String     @default("en") // en | ar
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  roles           UserRole[]
  transactions    Transaction[]
  documents       Document[]
  notifications   Notification[]
  auditLogs       AuditLog[]      @relation("AuditActor")
  aiActions       AIAction[]
  copilotSessions CopilotSession[]
}

model Role {
  id          String   @id @default(uuid()) @db.Uuid
  code        String   @unique // USER | ADMIN
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       UserRole[]
  permissions RolePermission[]
}

model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  code        String   @unique // e.g. transactions:write
  description String?
  createdAt   DateTime @default(now())

  roles RolePermission[]
}

model RolePermission {
  roleId       String @db.Uuid
  permissionId String @db.Uuid

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model UserRole {
  userId String @db.Uuid
  roleId String @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}

// ─── Service Catalog ───────────────────────────────────────────

model Service {
  id          String          @id @default(uuid()) @db.Uuid
  code        String          @unique // TRADE_LICENSE_RENEWAL
  nameEn      String
  nameAr      String
  category    ServiceCategory
  description String
  isActive    Boolean         @default(true)
  metadata    Json?           // fee hints, SLA days, demo flags
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  requirements ServiceRequirement[]
  transactions Transaction[]
}

model ServiceRequirement {
  id              String          @id @default(uuid()) @db.Uuid
  serviceId       String          @db.Uuid
  type            RequirementType
  code            String          // LICENSE_NUMBER | DOC_TENANCY
  labelEn         String
  labelAr         String
  dataType        FieldDataType?  // for FIELD
  documentType    String?         // for DOCUMENT (e.g. EMIRATES_ID)
  isMandatory     Boolean         @default(true)
  validationRules Json?           // regex, min/max, expiry required
  sortOrder       Int             @default(0)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([serviceId, code])
  @@index([serviceId, type])
}

// ─── Transactions ──────────────────────────────────────────────

model Transaction {
  id               String            @id @default(uuid()) @db.Uuid
  referenceCode    String            @unique // TRX-9824-A71
  userId           String            @db.Uuid
  serviceId        String            @db.Uuid
  status           TransactionStatus @default(DRAFT)
  title            String
  intentText       String?           // original NL request
  readinessScore   Int?              // 0–100, computed
  readinessBreakdown Json?           // explainable factors
  confidence       Float?            // intent/service confidence 0–1
  sandbox          Boolean           @default(true)
  submittedAt      DateTime?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  user          User               @relation(fields: [userId], references: [id])
  service       Service            @relation(fields: [serviceId], references: [id])
  steps         TransactionStep[]
  fields        TransactionField[]
  documents     Document[]
  insights      AIInsight[]
  aiActions     AIAction[]
  payments      Payment[]
  notifications Notification[]
  copilotSessions CopilotSession[]

  @@index([userId, status])
  @@index([serviceId])
  @@index([createdAt])
}

model TransactionStep {
  id            String     @id @default(uuid()) @db.Uuid
  transactionId String     @db.Uuid
  code          String     // SERVICE_IDENTIFIED | DOCUMENTS_VALIDATED | ...
  labelEn       String
  labelAr       String
  status        StepStatus @default(PENDING)
  sortOrder     Int
  startedAt     DateTime?
  completedAt   DateTime?
  meta          Json?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@unique([transactionId, code])
  @@index([transactionId, sortOrder])
}

model TransactionField {
  id            String      @id @default(uuid()) @db.Uuid
  transactionId String      @db.Uuid
  code          String      // COMPANY_NAME | LICENSE_NUMBER
  labelEn       String
  labelAr       String
  value         String?
  dataType      FieldDataType @default(STRING)
  source        FieldSource @default(USER_PROVIDED)
  isVerified    Boolean     @default(false)
  confidence    Float?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@unique([transactionId, code])
}

// ─── Documents & Analysis ──────────────────────────────────────

model Document {
  id            String         @id @default(uuid()) @db.Uuid
  userId        String         @db.Uuid
  transactionId String?        @db.Uuid
  fileName      String
  mimeType      String
  storageKey    String         // object storage / local path key
  sizeBytes     Int
  documentType  String?        // classified type
  status        DocumentStatus @default(UPLOADED)
  expiryDate    DateTime?
  checksum      String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user        User               @relation(fields: [userId], references: [id])
  transaction Transaction?       @relation(fields: [transactionId], references: [id])
  analyses    DocumentAnalysis[]

  @@index([userId])
  @@index([transactionId, status])
}

model DocumentAnalysis {
  id              String         @id @default(uuid()) @db.Uuid
  documentId      String         @db.Uuid
  status          AnalysisStatus @default(PENDING)
  provider        String         // MOCK | OPENAI | OCR_X
  classifiedType  String?
  extractedMeta   Json?          // name, id number, expiry, etc.
  qualityScore    Float?         // image quality 0–1
  validationScore Float?         // 0–100
  issues          Json?          // [{code, severity, message}]
  summary         String?        // user-facing explanation
  rawProviderRef  String?        // external job id — no raw PII dump
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId, createdAt])
}

// ─── AI Insights & Actions ─────────────────────────────────────

model AIInsight {
  id            String      @id @default(uuid()) @db.Uuid
  transactionId String?     @db.Uuid
  type          InsightType
  title         String
  summary       String      // safe user-facing text only
  evidence      Json?       // structured factors (not CoT)
  severity      String?     // info | warning | error
  createdAt     DateTime    @default(now())

  transaction Transaction? @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId, type])
}

model AIAction {
  id            String       @id @default(uuid()) @db.Uuid
  transactionId String?      @db.Uuid
  userId        String?      @db.Uuid
  type          AiActionType
  agentName     String
  inputSummary  String?      // redacted/short
  outputSummary String?
  success       Boolean      @default(true)
  latencyMs     Int?
  createdAt     DateTime     @default(now())

  transaction Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([transactionId, type])
  @@index([createdAt])
}

// ─── Payments (Sandbox) ────────────────────────────────────────

model Payment {
  id            String        @id @default(uuid()) @db.Uuid
  transactionId String        @db.Uuid
  currency      String        @default("AED")
  serviceFee    Decimal       @db.Decimal(12, 2)
  additionalFee Decimal       @default(0) @db.Decimal(12, 2)
  totalAmount   Decimal       @db.Decimal(12, 2)
  status        PaymentStatus @default(DRAFT)
  feeBreakdown  Json?         // line items
  sandbox       Boolean       @default(true)
  reviewedAt    DateTime?
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId, status])
}

// ─── Notifications & Audit ─────────────────────────────────────

model Notification {
  id            String           @id @default(uuid()) @db.Uuid
  userId        String           @db.Uuid
  transactionId String?          @db.Uuid
  type          NotificationType
  title         String
  body          String
  isRead        Boolean          @default(false)
  createdAt     DateTime         @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transaction Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)

  @@index([userId, isRead, createdAt])
}

model AuditLog {
  id         String      @id @default(uuid()) @db.Uuid
  actorId    String?     @db.Uuid
  action     AuditAction
  entityType String      // Transaction | Document | ...
  entityId   String?
  metadata   Json?       // non-sensitive context
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime    @default(now())

  actor User? @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId, createdAt])
  @@index([entityType, entityId])
  @@index([action, createdAt])
}

// ─── Copilot ───────────────────────────────────────────────────

model CopilotSession {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @db.Uuid
  transactionId String?
  title         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  transaction Transaction?      @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  messages    CopilotMessage[]

  @@index([userId, updatedAt])
}

model CopilotMessage {
  id        String   @id @default(uuid()) @db.Uuid
  sessionId String   @db.Uuid
  role      String   // user | assistant | system
  content   String
  citations Json?    // references to fields/docs/insights
  createdAt DateTime @default(now())

  session CopilotSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
}
```

---

## 4. Seed Data Plan

### Roles & permissions

- Roles: `USER`, `ADMIN`  
- Permissions: `transactions:read|write`, `documents:upload`, `ai:invoke`, `admin:audit`, etc.

### Demo services

| Code | Category | Primary demo |
|------|----------|--------------|
| `TRADE_LICENSE_RENEWAL` | BUSINESS | Yes |
| `EMIRATES_ID_UPDATE` | INDIVIDUAL | Secondary |
| `COMMERCIAL_PERMIT` | PERMIT | Secondary |

### Trade License Renewal requirements (example)

**Fields:** Company Name, License Number, License Type, Expiry Date, Renewal Period  

**Documents:** Current Trade License, Tenancy Contract, Memorandum of Association, Emirates ID, NOC (optional/warning)

### Demo user

- `khalid.demo@govflow.ai` / seeded password (local only)  
- Active Trade License transaction at ~82% readiness with mixed document states  
- One submitted transaction in `UNDER_REVIEW` for monitoring demo  
- History entries for completed / in-progress items  

**Do not** seed official government logos or claim real integrations.

---

## 5. Indexing & Integrity Notes

- Unique transaction `referenceCode` for human-facing IDs  
- Composite uniqueness on `(serviceId, code)` requirements and `(transactionId, code)` fields/steps  
- Document access always filtered by `userId` (enforced in services)  
- Audit and AIAction tables are append-oriented (no updates of historical rows)  
- Store file blobs outside DB (`storageKey`); DB keeps metadata only  
- `readinessBreakdown` JSON shape (stable contract):

```json
{
  "score": 82,
  "factors": {
    "documents": { "score": 80, "available": 4, "required": 5 },
    "information": { "score": 100, "complete": 5, "required": 5 },
    "validation": { "score": 90 },
    "potentialIssues": { "count": 1, "penalty": 10 },
    "missingRequirements": { "count": 1, "penalty": 10 }
  },
  "summary": "4/5 documents available; 1 validation warning; 1 missing requirement."
}
```

---

## 6. Future Extensions (non-blocking)

- `ServiceKnowledgeChunk` + pgvector for RAG over service guides  
- Soft-delete columns if compliance requires retention without hard delete  
- Multi-tenant `Organization` if B2B demo expands  

Do not implement these until Phase 3+ unless explicitly requested.
