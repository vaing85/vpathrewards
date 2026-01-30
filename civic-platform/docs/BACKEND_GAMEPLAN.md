# Backend Development Game Plan

## Current Status ✅

### Foundation (Completed)
- ✅ NestJS + GraphQL API setup
- ✅ Multi-tenant database schema
- ✅ Authentication & JWT
- ✅ User management (CRUD)
- ✅ Tenant management (bootstrap)
- ✅ RBAC (Role-Based Access Control)
- ✅ Audit logging system
- ✅ Exception handling
- ✅ Database seeding

### Infrastructure
- ✅ Prisma ORM integration
- ✅ SQLite for development
- ✅ Environment configuration
- ✅ Webpack configuration

---

## Phase 1: Core Business Modules 🎯

### Priority Order (Epic-based Development)

#### 1. **Citations Module** (First Priority)
**Purpose**: Issue and manage citations (tickets/violations)

**Database Schema**:
```prisma
model Citation {
  id          String   @id @default(cuid())
  tenantId   String
  citationNumber String @unique
  violatorName   String
  violatorEmail  String?
  violatorPhone  String?
  address        String
  violationType  String
  violationDate  DateTime
  issueDate      DateTime @default(now())
  status         CitationStatus
  amount         Float
  dueDate        DateTime
  paidDate       DateTime?
  notes          String?
  
  tenant        Tenant   @relation(...)
  violations    Violation[]
  payments      Payment[]
  documents     Document[]
  
  @@map("citations")
}

enum CitationStatus {
  PENDING
  ISSUED
  PAID
  DISPUTED
  DISMISSED
  OVERDUE
}
```

**Module Structure**:
- `citations.module.ts`
- `citations.service.ts` - Business logic
- `citations.resolver.ts` - GraphQL resolvers
- `dto/` - Input/Output types
  - `create-citation.input.ts`
  - `update-citation.input.ts`
  - `citation.output.ts`
  - `citation-filter.input.ts`

**GraphQL Operations**:
- `createCitation` - Create new citation
- `updateCitation` - Update citation details
- `citations` - List citations (with filters)
- `citation(id)` - Get single citation
- `deleteCitation` - Soft delete or archive

**Features**:
- Auto-generate citation numbers
- Status workflow management
- Due date calculation
- Tenant-scoped queries
- Role-based access (Officer, Clerk can create)

---

#### 2. **Violations Module** (Second Priority)
**Purpose**: Define violation types and rules

**Database Schema**:
```prisma
model Violation {
  id            String   @id @default(cuid())
  tenantId      String
  citationId    String
  violationCode String
  description   String
  fineAmount    Float
  points        Int?
  
  tenant        Tenant   @relation(...)
  citation      Citation  @relation(...)
  
  @@map("violations")
}

model ViolationType {
  id          String   @id @default(cuid())
  tenantId   String
  code        String
  name        String
  description String
  baseFine    Float
  points      Int?
  isActive    Boolean  @default(true)
  
  tenant      Tenant   @relation(...)
  
  @@unique([code, tenantId])
  @@map("violation_types")
}
```

**Module Structure**:
- `violations.module.ts`
- `violations.service.ts`
- `violations.resolver.ts`
- `dto/` - Violation DTOs

**GraphQL Operations**:
- `violationTypes` - List violation types
- `createViolationType` - Define new violation type
- `updateViolationType` - Update violation type
- `violations` - List violations (filtered by citation)

---

#### 3. **Cases Module** (Third Priority)
**Purpose**: Manage legal cases and disputes

**Database Schema**:
```prisma
model Case {
  id            String   @id @default(cuid())
  tenantId      String
  caseNumber    String   @unique
  citationId    String?
  caseType      CaseType
  status        CaseStatus
  description   String
  openedDate    DateTime @default(now())
  closedDate    DateTime?
  assignedTo    String?  // User ID
  
  tenant        Tenant   @relation(...)
  citation      Citation? @relation(...)
  hearings      Hearing[]
  documents     Document[]
  
  @@map("cases")
}

enum CaseType {
  DISPUTE
  APPEAL
  ENFORCEMENT
  OTHER
}

enum CaseStatus {
  OPEN
  IN_PROGRESS
  SCHEDULED
  CLOSED
  DISMISSED
}
```

**Module Structure**:
- `cases.module.ts`
- `cases.service.ts`
- `cases.resolver.ts`
- `dto/` - Case DTOs

**GraphQL Operations**:
- `createCase` - Open new case
- `updateCase` - Update case details
- `cases` - List cases (with filters)
- `case(id)` - Get single case
- `assignCase` - Assign case to officer/clerk

---

#### 4. **Hearings Module** (Fourth Priority)
**Purpose**: Schedule and manage court hearings

**Database Schema**:
```prisma
model Hearing {
  id            String   @id @default(cuid())
  tenantId      String
  caseId        String
  hearingType   String
  scheduledDate DateTime
  location      String
  status        HearingStatus
  notes         String?
  outcome       String?
  
  tenant        Tenant   @relation(...)
  case          Case     @relation(...)
  
  @@map("hearings")
}

enum HearingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  POSTPONED
}
```

**Module Structure**:
- `hearings.module.ts`
- `hearings.service.ts`
- `hearings.resolver.ts`
- `dto/` - Hearing DTOs

**GraphQL Operations**:
- `createHearing` - Schedule hearing
- `updateHearing` - Update hearing details
- `hearings` - List hearings (with date filters)
- `hearing(id)` - Get single hearing
- `cancelHearing` - Cancel/postpone hearing

---

#### 5. **Payments Module** (Fifth Priority)
**Purpose**: Process payments for citations

**Database Schema**:
```prisma
model Payment {
  id            String   @id @default(cuid())
  tenantId      String
  citationId    String
  amount        Float
  paymentMethod PaymentMethod
  transactionId String?
  status        PaymentStatus
  paidDate      DateTime @default(now())
  notes         String?
  
  tenant        Tenant   @relation(...)
  citation      Citation @relation(...)
  
  @@map("payments")
}

enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
  DEBIT_CARD
  ONLINE
  OTHER
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

**Module Structure**:
- `payments.module.ts`
- `payments.service.ts`
- `payments.resolver.ts`
- `dto/` - Payment DTOs

**GraphQL Operations**:
- `createPayment` - Record payment
- `payments` - List payments (filtered by citation)
- `payment(id)` - Get single payment
- `refundPayment` - Process refund

---

#### 6. **Documents Module** (Sixth Priority)
**Purpose**: Attach documents to citations/cases

**Database Schema**:
```prisma
model Document {
  id            String   @id @default(cuid())
  tenantId      String
  entityType    String   // 'Citation' | 'Case'
  entityId      String
  fileName      String
  filePath      String
  fileType      String
  fileSize      Int
  uploadedBy    String   // User ID
  uploadedAt    DateTime @default(now())
  description   String?
  
  tenant        Tenant   @relation(...)
  
  @@map("documents")
}
```

**Module Structure**:
- `documents.module.ts`
- `documents.service.ts`
- `documents.resolver.ts`
- `dto/` - Document DTOs

**GraphQL Operations**:
- `uploadDocument` - Upload file (multipart)
- `documents` - List documents (filtered by entity)
- `document(id)` - Get document metadata
- `deleteDocument` - Remove document

---

## Development Approach

### For Each Module:

1. **Database Schema** (Prisma)
   - Add models to `schema.prisma`
   - Create migration: `npm run prisma:migrate -- --name add_citations`
   - Generate Prisma client: `npm run prisma:generate`

2. **Service Layer** (Business Logic)
   - Create service with CRUD operations
   - Implement tenant-scoping
   - Add validation
   - Handle business rules

3. **DTOs** (Data Transfer Objects)
   - Input types for mutations
   - Output types for queries
   - Filter types for list queries

4. **Resolver** (GraphQL API)
   - Define GraphQL schema
   - Implement queries and mutations
   - Add authorization guards
   - Handle errors

5. **Module Registration**
   - Add module to `app.module.ts`
   - Export service if needed

6. **Testing**
   - Unit tests for service
   - Integration tests for resolver
   - E2E tests for full flow

---

## Implementation Checklist

### Citations Module
- [ ] Add Citation model to schema
- [ ] Create migration
- [ ] Generate Prisma client
- [ ] Create citations module structure
- [ ] Implement citations.service.ts
- [ ] Create DTOs
- [ ] Implement citations.resolver.ts
- [ ] Add authorization guards
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

### Violations Module
- [ ] Add Violation and ViolationType models
- [ ] Create migration
- [ ] Generate Prisma client
- [ ] Implement violations module
- [ ] Create DTOs
- [ ] Implement resolver
- [ ] Add tests

### Cases Module
- [ ] Add Case model
- [ ] Create migration
- [ ] Implement cases module
- [ ] Link to citations
- [ ] Add tests

### Hearings Module
- [ ] Add Hearing model
- [ ] Create migration
- [ ] Implement hearings module
- [ ] Link to cases
- [ ] Add scheduling logic
- [ ] Add tests

### Payments Module
- [ ] Add Payment model
- [ ] Create migration
- [ ] Implement payments module
- [ ] Link to citations
- [ ] Add payment processing logic
- [ ] Add tests

### Documents Module
- [ ] Add Document model
- [ ] Create migration
- [ ] Implement documents module
- [ ] Add file upload handling
- [ ] Add file storage integration
- [ ] Add tests

---

## Best Practices

### Tenant Scoping
- **Always** filter by `tenantId` in queries
- Use `@TenantId()` decorator in resolvers
- Validate tenant access in services
- Never expose cross-tenant data

### Authorization
- Use `@Roles()` decorator for role-based access
- Implement permission checks in services
- Document required roles for each operation

### Error Handling
- Use appropriate HTTP/GraphQL error codes
- Provide meaningful error messages
- Log errors for debugging
- Don't expose sensitive information

### Validation
- Validate all inputs using class-validator
- Check business rules in services
- Return clear validation errors

### Audit Logging
- Log all create/update/delete operations
- Include user context
- Store relevant metadata

---

## Testing Strategy

### Unit Tests
- Test service methods in isolation
- Mock Prisma client
- Test business logic
- Test error cases

### Integration Tests
- Test GraphQL resolvers
- Test with real database (test DB)
- Test authorization
- Test tenant isolation

### E2E Tests
- Test full user flows
- Test cross-module interactions
- Test error scenarios
- Test performance

---

## Performance Considerations

- Add database indexes for frequently queried fields
- Use pagination for list queries
- Implement caching where appropriate
- Optimize N+1 queries with Prisma includes
- Add query complexity limits

---

## Security Checklist

- [ ] All queries tenant-scoped
- [ ] Role-based access enforced
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention
- [ ] Rate limiting (future)
- [ ] File upload validation
- [ ] Secure file storage

---

## Next Steps

1. **Start with Citations Module** (highest priority)
2. Follow the checklist for each module
3. Test thoroughly before moving to next module
4. Document as you go
5. Review and refactor after each module

---

## Timeline Estimate

- **Citations Module**: 2-3 days
- **Violations Module**: 1-2 days
- **Cases Module**: 2-3 days
- **Hearings Module**: 2 days
- **Payments Module**: 2 days
- **Documents Module**: 2-3 days

**Total Phase 1**: ~2-3 weeks

---

## Questions to Clarify

1. Citation number format? (e.g., "CIT-2024-001")
2. Payment gateway integration? (Stripe, PayPal, etc.)
3. File storage solution? (Local, S3, etc.)
4. Email notifications needed?
5. Reporting requirements?
6. Export functionality needed?
