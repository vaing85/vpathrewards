# Comprehensive Testing Guide - Civic Platform

This guide provides step-by-step instructions for testing all modules in the Civic Platform backend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Setup](#authentication-setup)
3. [Module Testing](#module-testing)
   - [Citations Module](#1-citations-module)
   - [Violations Module](#2-violations-module)
   - [Cases Module](#3-cases-module)
   - [Hearings Module](#4-hearings-module)
   - [Payments Module](#5-payments-module)
   - [Documents Module](#6-documents-module)
4. [End-to-End Workflows](#end-to-end-workflows)
5. [Error Scenarios](#error-scenarios)
6. [GraphQL Playground Setup](#graphql-playground-setup)

---

## Prerequisites

1. **Backend server running**: `npm run dev` in `apps/api`
2. **Database seeded**: Run `npm run prisma:seed` in `apps/api`
3. **GraphQL Playground**: Access at `http://localhost:3001/graphql`

### Default Credentials (from seed)

- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: Admin (has access to all operations)

---

## Authentication Setup

### Step 1: Login and Get Token

```graphql
mutation {
  login(input: {
    email: "admin@example.com"
    password: "admin123"
  }) {
    accessToken
    user {
      id
      email
      name
      tenantId
    }
  }
}
```

**Response Example:**
```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "clx...",
        "email": "admin@example.com",
        "name": "Admin User",
        "tenantId": "clx..."
      }
    }
  }
}
```

### Step 2: Configure Authorization Header

**In GraphQL Playground:**
1. Open the **HTTP HEADERS** panel at the bottom
2. Add the following:
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token from the login response.

### Step 3: Verify Authentication

```graphql
query {
  me {
    id
    email
    name
    tenantId
  }
}
```

---

## Module Testing

## 1. Citations Module

### 1.1 Create Citation

```graphql
mutation {
  createCitation(input: {
    violatorName: "John Doe"
    violatorEmail: "john.doe@example.com"
    violatorPhone: "555-0100"
    address: "123 Main St, City, State 12345"
    violationType: "Parking Violation"
    violationDate: "2024-12-10T10:00:00Z"
    amount: 50.00
    dueDate: "2024-12-24T23:59:59Z"
    notes: "Parked in no-parking zone"
  }) {
    id
    citationNumber
    violatorName
    violatorEmail
    status
    amount
    dueDate
    createdAt
  }
}
```

**Expected:**
- ✅ Auto-generated `citationNumber` (format: `CIT-2024-00001`)
- ✅ Status defaults to `PENDING`
- ✅ `issueDate` set automatically

### 1.2 List All Citations

```graphql
query {
  citations {
    id
    citationNumber
    violatorName
    status
    amount
    dueDate
  }
}
```

### 1.3 Get Single Citation

```graphql
query {
  citation(id: "<citation-id>") {
    id
    citationNumber
    violatorName
    violatorEmail
    violatorPhone
    address
    violationType
    violationDate
    issueDate
    status
    amount
    dueDate
    paidDate
    notes
    violations {
      id
      violationCode
      description
      fineAmount
    }
  }
}
```

### 1.4 Update Citation

```graphql
mutation {
  updateCitation(
    id: "<citation-id>"
    input: {
      status: "ISSUED"
      notes: "Citation has been issued and mailed"
    }
  ) {
    id
    citationNumber
    status
    notes
  }
}
```

### 1.5 Filter Citations

```graphql
query {
  citations(filter: {
    status: "PENDING"
    violatorName: "John"
    limit: 10
    offset: 0
  }) {
    id
    citationNumber
    violatorName
    status
    amount
  }
}
```

### 1.6 Issue Citation

```graphql
mutation {
  issueCitation(id: "<citation-id>") {
    id
    citationNumber
    status
    issueDate
  }
}
```

**Expected:** Status changes to `ISSUED`

---

## 2. Violations Module

### 2.1 Create Violation Type

```graphql
mutation {
  createViolationType(input: {
    code: "P-001"
    name: "No Parking Zone"
    description: "Vehicle parked in a designated no-parking zone"
    baseFine: 50.00
    points: 2
    isActive: true
  }) {
    id
    code
    name
    description
    baseFine
    points
    isActive
  }
}
```

### 2.2 List Violation Types

```graphql
query {
  violationTypes {
    id
    code
    name
    description
    baseFine
    points
    isActive
  }
}
```

### 2.3 Update Violation Type

```graphql
mutation {
  updateViolationType(
    id: "<violation-type-id>"
    input: {
      baseFine: 75.00
      description: "Updated description"
    }
  ) {
    id
    code
    baseFine
    description
  }
}
```

### 2.4 Create Violation (linked to Citation)

```graphql
mutation {
  createViolation(input: {
    citationId: "<citation-id>"
    violationCode: "P-001"
    description: "Parked in no-parking zone during business hours"
    fineAmount: 50.00
    points: 2
  }) {
    id
    violationCode
    description
    fineAmount
    points
    citation {
      citationNumber
      violatorName
    }
  }
}
```

**Expected:**
- ✅ Violation linked to citation
- ✅ Citation violations list updated

### 2.5 List Violations

```graphql
query {
  violations {
    id
    violationCode
    description
    fineAmount
    citation {
      citationNumber
      violatorName
    }
  }
}
```

### 2.6 Get Single Violation

```graphql
query {
  violation(id: "<violation-id>") {
    id
    violationCode
    description
    fineAmount
    points
    citation {
      id
      citationNumber
      violatorName
      status
    }
  }
}
```

### 2.7 Update Violation

```graphql
mutation {
  updateViolation(
    id: "<violation-id>"
    input: {
      fineAmount: 60.00
      description: "Updated violation description"
    }
  ) {
    id
    fineAmount
    description
  }
}
```

---

## 3. Cases Module

### 3.1 Create Case (linked to Citation)

```graphql
mutation {
  createCase(input: {
    citationId: "<citation-id>"
    caseType: "DISPUTE"
    description: "Violator disputes the parking violation, claims signage was unclear"
  }) {
    id
    caseNumber
    caseType
    status
    description
    openedDate
    citation {
      citationNumber
      violatorName
    }
  }
}
```

**Expected:**
- ✅ Auto-generated `caseNumber` (format: `CASE-2024-00001`)
- ✅ Status defaults to `OPEN`
- ✅ Linked to citation

### 3.2 List All Cases

```graphql
query {
  cases {
    id
    caseNumber
    caseType
    status
    description
    openedDate
    citation {
      citationNumber
    }
  }
}
```

### 3.3 Get Single Case

```graphql
query {
  case(id: "<case-id>") {
    id
    caseNumber
    caseType
    status
    description
    openedDate
    closedDate
    assignedTo
    citation {
      citationNumber
      violatorName
      amount
    }
  }
}
```

### 3.4 Assign Case to User

```graphql
mutation {
  assignCase(id: "<case-id>", userId: "<user-id>") {
    id
    caseNumber
    assignedTo
    status
  }
}
```

**Note:** Get user ID from `users` query or use the admin user ID from `me` query.

### 3.5 Update Case

```graphql
mutation {
  updateCase(
    id: "<case-id>"
    input: {
      status: "IN_PROGRESS"
      description: "Case is being reviewed by assigned officer"
    }
  ) {
    id
    caseNumber
    status
    description
  }
}
```

### 3.6 Close Case

```graphql
mutation {
  closeCase(id: "<case-id>") {
    id
    caseNumber
    status
    closedDate
  }
}
```

**Expected:** Status changes to `CLOSED`, `closedDate` is set

### 3.7 Filter Cases

```graphql
query {
  cases(filter: {
    status: "OPEN"
    caseType: "DISPUTE"
    limit: 10
  }) {
    id
    caseNumber
    caseType
    status
    openedDate
  }
}
```

---

## 4. Hearings Module

### 4.1 Create Hearing (linked to Case)

```graphql
mutation {
  createHearing(input: {
    caseId: "<case-id>"
    hearingType: "Initial Hearing"
    scheduledDate: "2024-12-20T10:00:00Z"
    location: "City Hall, Room 101"
    notes: "Initial hearing for case dispute"
  }) {
    id
    hearingType
    scheduledDate
    location
    status
    notes
    case {
      caseNumber
      caseType
    }
  }
}
```

**Expected:**
- ✅ Status defaults to `SCHEDULED`
- ✅ Linked to case

### 4.2 List All Hearings

```graphql
query {
  hearings {
    id
    hearingType
    scheduledDate
    location
    status
    case {
      caseNumber
      caseType
    }
  }
}
```

### 4.3 Get Single Hearing

```graphql
query {
  hearing(id: "<hearing-id>") {
    id
    hearingType
    scheduledDate
    location
    status
    notes
    outcome
    case {
      id
      caseNumber
      caseType
      status
      description
    }
  }
}
```

### 4.4 Update Hearing

```graphql
mutation {
  updateHearing(
    id: "<hearing-id>"
    input: {
      status: "IN_PROGRESS"
      notes: "Hearing in progress"
    }
  ) {
    id
    status
    notes
  }
}
```

### 4.5 Cancel Hearing

```graphql
mutation {
  cancelHearing(
    id: "<hearing-id>"
    reason: "Violator requested cancellation"
  ) {
    id
    status
    notes
  }
}
```

**Expected:** Status changes to `CANCELLED`

### 4.6 Postpone Hearing

```graphql
mutation {
  postponeHearing(
    id: "<hearing-id>"
    newDate: "2024-12-27T10:00:00Z"
    reason: "Requested by violator due to scheduling conflict"
  ) {
    id
    scheduledDate
    status
    notes
  }
}
```

**Expected:** Status changes to `POSTPONED`, `scheduledDate` updated

### 4.7 Complete Hearing

```graphql
mutation {
  completeHearing(
    id: "<hearing-id>"
    outcome: "Case dismissed - insufficient evidence"
  ) {
    id
    status
    outcome
  }
}
```

**Expected:** Status changes to `COMPLETED`, `outcome` is set

### 4.8 Filter Hearings

```graphql
query {
  hearings(filter: {
    caseId: "<case-id>"
    status: "SCHEDULED"
    scheduledDateFrom: "2024-12-01T00:00:00Z"
    scheduledDateTo: "2024-12-31T23:59:59Z"
  }) {
    id
    hearingType
    scheduledDate
    status
  }
}
```

---

## 5. Payments Module

### 5.1 Create Payment (linked to Citation)

```graphql
mutation {
  createPayment(input: {
    citationId: "<citation-id>"
    amount: 50.00
    paymentMethod: "CREDIT_CARD"
    transactionId: "TXN-12345"
    notes: "Payment processed via online portal"
  }) {
    id
    amount
    paymentMethod
    transactionId
    status
    paidDate
    citation {
      citationNumber
      violatorName
      amount
    }
  }
}
```

**Expected:**
- ✅ Status defaults to `PENDING`
- ✅ `paidDate` set automatically

### 5.2 Complete Payment

```graphql
mutation {
  updatePayment(
    id: "<payment-id>"
    input: {
      status: "COMPLETED"
    }
  ) {
    id
    status
    citation {
      citationNumber
      status
      paidDate
    }
  }
}
```

**Expected:**
- ✅ Payment status changes to `COMPLETED`
- ✅ Citation status automatically changes to `PAID` (if total payments >= citation amount)
- ✅ Citation `paidDate` is set

### 5.3 List All Payments

```graphql
query {
  payments {
    id
    amount
    paymentMethod
    status
    paidDate
    citation {
      citationNumber
      violatorName
    }
  }
}
```

### 5.4 Get Single Payment

```graphql
query {
  payment(id: "<payment-id>") {
    id
    amount
    paymentMethod
    transactionId
    status
    paidDate
    notes
    citation {
      id
      citationNumber
      violatorName
      amount
      status
    }
  }
}
```

### 5.5 Get Citation Payment Summary

```graphql
query {
  citationPaymentSummary(citationId: "<citation-id>") {
    citationAmount
    totalPaid
    remaining
    paymentsCount
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "citationPaymentSummary": {
      "citationAmount": 50.00,
      "totalPaid": 50.00,
      "remaining": 0.00,
      "paymentsCount": 1
    }
  }
}
```

### 5.6 Process Refund

```graphql
mutation {
  refundPayment(
    id: "<payment-id>"
    reason: "Payment processed in error"
  ) {
    id
    status
    notes
    citation {
      citationNumber
      status
    }
  }
}
```

**Expected:**
- ✅ Payment status changes to `REFUNDED`
- ✅ Citation status may revert (if total paid < citation amount)

### 5.7 Filter Payments

```graphql
query {
  payments(filter: {
    citationId: "<citation-id>"
    status: "COMPLETED"
    paymentMethod: "CREDIT_CARD"
    paidDateFrom: "2024-12-01T00:00:00Z"
    paidDateTo: "2024-12-31T23:59:59Z"
  }) {
    id
    amount
    paymentMethod
    status
    paidDate
  }
}
```

---

## 6. Documents Module

### 6.1 Create Document (linked to Citation)

```graphql
mutation {
  createDocument(input: {
    entityType: "Citation"
    entityId: "<citation-id>"
    fileName: "parking_ticket_photo.jpg"
    filePath: "/uploads/citations/parking_ticket_photo.jpg"
    fileType: "image/jpeg"
    fileSize: 245760
    description: "Photo evidence of parking violation"
  }) {
    id
    fileName
    filePath
    fileType
    fileSize
    uploadedBy
    uploadedAt
    description
  }
}
```

**Expected:**
- ✅ `uploadedBy` set to current user ID
- ✅ `uploadedAt` set automatically

### 6.2 Create Document (linked to Case)

```graphql
mutation {
  createDocument(input: {
    entityType: "Case"
    entityId: "<case-id>"
    fileName: "dispute_letter.pdf"
    filePath: "/uploads/cases/dispute_letter.pdf"
    fileType: "application/pdf"
    fileSize: 512000
    description: "Formal dispute letter from violator"
  }) {
    id
    fileName
    filePath
    fileType
    fileSize
    entityType
    entityId
  }
}
```

### 6.3 List All Documents

```graphql
query {
  documents {
    id
    fileName
    fileType
    fileSize
    entityType
    entityId
    uploadedAt
    description
  }
}
```

### 6.4 Get Documents by Entity

```graphql
query {
  documentsByEntity(
    entityType: "Citation"
    entityId: "<citation-id>"
  ) {
    id
    fileName
    filePath
    fileType
    fileSize
    uploadedAt
    description
  }
}
```

### 6.5 Get Single Document

```graphql
query {
  document(id: "<document-id>") {
    id
    fileName
    filePath
    fileType
    fileSize
    entityType
    entityId
    uploadedBy
    uploadedAt
    description
    createdAt
  }
}
```

### 6.6 Update Document

```graphql
mutation {
  updateDocument(
    id: "<document-id>"
    input: {
      fileName: "updated_filename.jpg"
      description: "Updated description"
    }
  ) {
    id
    fileName
    description
  }
}
```

### 6.7 Delete Document

```graphql
mutation {
  deleteDocument(id: "<document-id>")
}
```

**Expected:** Returns `true` if successful

### 6.8 Filter Documents

```graphql
query {
  documents(filter: {
    entityType: "Citation"
    entityId: "<citation-id>"
    fileType: "image"
    limit: 10
  }) {
    id
    fileName
    fileType
    fileSize
  }
}
```

---

## End-to-End Workflows

### Workflow 1: Complete Citation Lifecycle

1. **Create Citation**
   ```graphql
   mutation { createCitation(input: {...}) { id citationNumber } }
   ```

2. **Create Violation Type**
   ```graphql
   mutation { createViolationType(input: {...}) { id code } }
   ```

3. **Add Violation to Citation**
   ```graphql
   mutation { createViolation(input: { citationId: "..." }) { id } }
   ```

4. **Issue Citation**
   ```graphql
   mutation { issueCitation(id: "...") { status } }
   ```

5. **Create Payment**
   ```graphql
   mutation { createPayment(input: { citationId: "..." }) { id } }
   ```

6. **Complete Payment**
   ```graphql
   mutation { updatePayment(id: "...", input: { status: "COMPLETED" }) { status } }
   ```

7. **Verify Citation Status**
   ```graphql
   query { citation(id: "...") { status paidDate } }
   ```
   **Expected:** Status = `PAID`, `paidDate` is set

8. **Attach Document**
   ```graphql
   mutation { createDocument(input: { entityType: "Citation", entityId: "..." }) { id } }
   ```

### Workflow 2: Dispute Process

1. **Create Citation** (from Workflow 1, step 1)

2. **Create Case (Dispute)**
   ```graphql
   mutation { createCase(input: { citationId: "...", caseType: "DISPUTE" }) { id caseNumber } }
   ```

3. **Assign Case**
   ```graphql
   mutation { assignCase(id: "...", userId: "...") { assignedTo } }
   ```

4. **Schedule Hearing**
   ```graphql
   mutation { createHearing(input: { caseId: "..." }) { id scheduledDate } }
   ```

5. **Attach Case Documents**
   ```graphql
   mutation { createDocument(input: { entityType: "Case", entityId: "..." }) { id } }
   ```

6. **Complete Hearing**
   ```graphql
   mutation { completeHearing(id: "...", outcome: "...") { status outcome } }
   ```

7. **Close Case**
   ```graphql
   mutation { closeCase(id: "...") { status closedDate } }
   ```

### Workflow 3: Payment Refund Process

1. **Create Citation** (from Workflow 1, step 1)

2. **Create and Complete Payment**
   ```graphql
   mutation { createPayment(input: {...}) { id } }
   mutation { updatePayment(id: "...", input: { status: "COMPLETED" }) { status } }
   ```

3. **Verify Citation is Paid**
   ```graphql
   query { citation(id: "...") { status } }
   ```

4. **Process Refund**
   ```graphql
   mutation { refundPayment(id: "...", reason: "Error") { status } }
   ```

5. **Verify Citation Status Reverted**
   ```graphql
   query { citation(id: "...") { status } }
   ```
   **Expected:** Status may revert to `ISSUED` or `OVERDUE`

---

## Error Scenarios

### 1. Authentication Errors

**Test:** Try query without token
```graphql
query {
  citations {
    id
  }
}
```
**Expected:** `Unauthorized` error

**Test:** Invalid token
```json
{
  "Authorization": "Bearer invalid_token"
}
```
**Expected:** `Unauthorized` or `Forbidden` error

### 2. Not Found Errors

**Test:** Query non-existent citation
```graphql
query {
  citation(id: "non-existent-id") {
    id
  }
}
```
**Expected:** `Citation with ID non-existent-id not found`

### 3. Validation Errors

**Test:** Create citation with invalid data
```graphql
mutation {
  createCitation(input: {
    violatorName: ""  # Empty name
    amount: -10       # Negative amount
  }) {
    id
  }
}
```
**Expected:** Validation errors for required fields and invalid values

### 4. Business Logic Errors

**Test:** Refund non-completed payment
```graphql
mutation {
  refundPayment(id: "<pending-payment-id>", reason: "Test")
}
```
**Expected:** `Can only refund completed payments`

**Test:** Cancel completed hearing
```graphql
mutation {
  cancelHearing(id: "<completed-hearing-id>", reason: "Test")
}
```
**Expected:** `Cannot cancel a hearing that has already been completed`

**Test:** Create payment exceeding citation amount
```graphql
mutation {
  createPayment(input: {
    citationId: "<citation-id>"
    amount: 999999.00  # Exceeds citation amount
  }) {
    id
  }
}
```
**Note:** This may be allowed (partial payments), but citation status won't change until total paid >= citation amount

### 5. Tenant Isolation Errors

**Test:** Access data from different tenant
- Create a second tenant
- Try to access first tenant's citations with second tenant's token
**Expected:** Empty results (tenant isolation working)

### 6. Role-Based Access Errors

**Test:** Inspector trying to create payment
```graphql
# Login as Inspector (if exists) or create one
mutation {
  createPayment(input: {...}) {
    id
  }
}
```
**Expected:** `Access denied. Required roles: Admin, Clerk`

---

## GraphQL Playground Setup

### Using GraphQL Playground

1. **Open Playground**: Navigate to `http://localhost:3001/graphql`

2. **Set Authorization Header**:
   - Click on **HTTP HEADERS** tab at the bottom
   - Add:
   ```json
   {
     "Authorization": "Bearer YOUR_TOKEN_HERE"
   }
   ```

3. **Test Queries**:
   - Use the left panel to write queries
   - Click the play button or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - View results in the right panel

4. **View Schema**:
   - Click **Schema** tab on the right
   - Explore available queries and mutations

### Using cURL

```bash
# Login
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"admin@example.com\", password: \"admin123\" }) { accessToken } }"
  }'

# Query with token
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { citations { id citationNumber } }"
  }'
```

### Using Postman

1. **Create Collection**: "Civic Platform API"

2. **Set Collection Variable**: `token` = (from login response)

3. **Add Authorization**:
   - Type: Bearer Token
   - Token: `{{token}}`

4. **Create Requests**:
   - Method: POST
   - URL: `http://localhost:3001/graphql`
   - Body: GraphQL (raw)
   - Query: Your GraphQL query/mutation

---

## Testing Checklist

### Citations Module ✅
- [ ] Create citation
- [ ] List citations
- [ ] Get single citation
- [ ] Update citation
- [ ] Filter citations
- [ ] Issue citation
- [ ] Verify auto-generated citation number

### Violations Module ✅
- [ ] Create violation type
- [ ] List violation types
- [ ] Update violation type
- [ ] Create violation (linked to citation)
- [ ] List violations
- [ ] Get single violation
- [ ] Update violation

### Cases Module ✅
- [ ] Create case (linked to citation)
- [ ] List cases
- [ ] Get single case
- [ ] Assign case
- [ ] Update case
- [ ] Close case
- [ ] Filter cases
- [ ] Verify auto-generated case number

### Hearings Module ✅
- [ ] Create hearing (linked to case)
- [ ] List hearings
- [ ] Get single hearing
- [ ] Update hearing
- [ ] Cancel hearing
- [ ] Postpone hearing
- [ ] Complete hearing
- [ ] Filter hearings

### Payments Module ✅
- [ ] Create payment (linked to citation)
- [ ] List payments
- [ ] Get single payment
- [ ] Update payment status
- [ ] Complete payment (verify citation status update)
- [ ] Get payment summary
- [ ] Process refund
- [ ] Filter payments

### Documents Module ✅
- [ ] Create document (linked to citation)
- [ ] Create document (linked to case)
- [ ] List documents
- [ ] Get documents by entity
- [ ] Get single document
- [ ] Update document
- [ ] Delete document
- [ ] Filter documents
- [ ] Verify file validation (type, size)

### Integration Tests ✅
- [ ] Complete citation lifecycle
- [ ] Dispute process workflow
- [ ] Payment refund process
- [ ] Multi-entity document attachments

### Error Handling ✅
- [ ] Authentication errors
- [ ] Not found errors
- [ ] Validation errors
- [ ] Business logic errors
- [ ] Tenant isolation
- [ ] Role-based access control

---

## Tips for Testing

1. **Save IDs**: Keep track of created IDs for chaining operations
2. **Test Incrementally**: Test one module at a time before moving to workflows
3. **Verify Relationships**: Always check that linked entities are properly connected
4. **Check Auto-Generated Fields**: Verify citation numbers, case numbers, dates
5. **Test Edge Cases**: Empty strings, null values, boundary conditions
6. **Monitor Audit Logs**: Check that operations are being logged
7. **Verify Tenant Isolation**: Ensure data from one tenant isn't visible to another

---

## Troubleshooting

### "Unauthorized" Errors
- ✅ Check token is set in HTTP HEADERS
- ✅ Verify token hasn't expired
- ✅ Re-login to get fresh token

### "Not Found" Errors
- ✅ Verify entity ID exists
- ✅ Check entity belongs to your tenant
- ✅ Ensure entity wasn't deleted

### "Access Denied" Errors
- ✅ Check user has required role
- ✅ Verify role is assigned in database
- ✅ Admin role should have access to everything

### Validation Errors
- ✅ Check all required fields are provided
- ✅ Verify data types match (dates, numbers, strings)
- ✅ Check field constraints (min/max values, string lengths)

---

**Happy Testing! 🚀**

For issues or questions, refer to:
- `docs/BACKEND_GAMEPLAN.md` - Module specifications
- `docs/ARCHITECTURE.md` - System architecture
- `apps/api/src/modules/*/` - Source code
