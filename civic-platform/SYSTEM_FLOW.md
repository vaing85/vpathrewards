# Civic Platform System Flow

## Overview

The Civic Platform is a multi-tenant citation management system that handles the complete lifecycle from citation creation through payment processing and case management.

---

## Core Entities & Relationships

```
Citation
  ├── Violations (one-to-many)
  ├── Cases (one-to-many)
  ├── Payments (one-to-many)
  └── Documents (one-to-many)

Case
  ├── Citation (many-to-one, optional)
  └── Hearings (one-to-many)

Hearing
  └── Case (many-to-one, required)

ViolationType (Template)
  └── Used to create Violations
```

---

## 1. Citation Creation Flow

### Step 1: Create a Citation
**Location:** `/citations/new`

**Process:**
1. User fills out the citation form with:
   - **Violator Information:**
     - Name (required)
     - Email (optional)
     - Phone (optional)
     - Address (required) - now split into:
       - Street Address
       - City
       - State (2 characters, auto-uppercase)
       - Zip Code
   - **Violation Details:**
     - Violation Type (required) - e.g., "Parking Violation"
     - Violation Date (required)
     - Amount (required)
     - Due Date (required)
     - Notes (optional)

2. System automatically:
   - Generates a unique citation number (format: `CIT-YYYY-XXXXX`)
   - Sets status to `PENDING`
   - Sets issue date to current date/time
   - Associates citation with the current tenant

3. Citation is saved to database with status `PENDING`

**Status Flow:**
```
PENDING → ISSUED → PAID/DISPUTED/DISMISSED/OVERDUE
```

---

## 2. Adding Violations to Citations

### Step 1: Navigate to Citation Detail Page
**Location:** `/citations/[id]`

The citation detail page shows:
- Citation information
- List of violations (if any)
- Related cases
- Documents
- Payment summary
- Payment history

### Step 2: Add a Violation
**Location:** `/citations/[id]/violations/new`

**Process:**
1. User clicks "+ Add" button in the Violations section
2. System navigates to the violation creation form
3. User can either:
   - **Select from Violation Types** (predefined templates):
     - System loads available violation types
     - User selects a type
     - Form auto-fills with:
       - Violation Code
       - Description
       - Base Fine Amount
       - Points (if applicable)
   - **Enter manually:**
     - Violation Code (required)
     - Description (required)
     - Fine Amount (required)
     - Points (optional)

4. System validates:
   - Citation exists and belongs to tenant
   - All required fields are provided

5. Violation is created and linked to the citation

**Important Notes:**
- A citation can have **multiple violations**
- Each violation has its own fine amount
- Violations are linked to citations via `citationId`
- The citation's total amount may be the sum of all violation fines

---

## 3. Case Management Flow

### Step 1: Create a Case
**Location:** `/cases/new` or `/citations/[id]` (via "New Case" button)

**Process:**
1. User can create a case:
   - **From a Citation:** Click "New Case" on citation detail page
     - Citation ID is pre-filled
   - **Standalone:** Navigate to `/cases/new`
     - Citation ID is optional

2. User fills out case form:
   - **Case Type** (required):
     - `DISPUTE` - Violator disputes the citation
     - `APPEAL` - Violator appeals the citation
     - `ENFORCEMENT` - Enforcement action needed
     - `OTHER` - Other case types
   - **Description** (required)
   - **Citation** (optional) - if creating from citation page
   - **Assigned To** (optional) - assign to a user/officer

3. System automatically:
   - Generates unique case number (format: `CASE-YYYY-XXXXX`)
   - Sets status to `OPEN`
   - Sets opened date to current date/time

4. Case is created and linked to citation (if provided)

**Case Status Flow:**
```
OPEN → IN_PROGRESS → SCHEDULED → CLOSED/DISMISSED
```

---

## 4. Hearing Management Flow

### Step 1: Schedule a Hearing
**Location:** `/hearings/new?caseId=[id]` or from case detail page

**Process:**
1. User navigates to hearing creation form
   - Case ID is pre-filled if coming from case detail page
   - User can select a case from dropdown if creating standalone

2. User fills out hearing form:
   - **Case** (required) - select the case
   - **Hearing Type** (required) - e.g., "Initial Hearing", "Appeal Hearing"
   - **Scheduled Date** (required) - date and time
   - **Location** (required) - hearing location
   - **Notes** (optional)

3. System automatically:
   - Sets status to `SCHEDULED`
   - Links hearing to the case

4. Hearing is created

**Hearing Status Flow:**
```
SCHEDULED → IN_PROGRESS → COMPLETED/CANCELLED/POSTPONED
```

**Important Notes:**
- Hearings are always linked to a case (required)
- A case can have multiple hearings
- Hearing outcome can be recorded when completed

---

## 5. Payment Processing Flow

### Step 1: Record a Payment
**Location:** `/payments/new?citationId=[id]` or from citation detail page

**Process:**
1. User navigates to payment creation form
   - Citation ID is pre-filled if coming from citation detail page
   - User can select a citation from dropdown if creating standalone

2. User fills out payment form:
   - **Citation** (required) - select the citation
   - **Amount** (required) - payment amount
   - **Payment Method** (required):
     - `CASH`
     - `CHECK`
     - `CREDIT_CARD`
     - `DEBIT_CARD`
     - `ONLINE`
     - `OTHER`
   - **Transaction ID** (optional) - for tracking
   - **Paid Date** (required) - defaults to current date
   - **Notes** (optional)

3. System automatically:
   - Sets status to `PENDING` initially
   - Links payment to citation
   - Records paid date

4. Payment is created

**Payment Status Flow:**
```
PENDING → COMPLETED/FAILED/REFUNDED
```

**Payment Summary:**
- The citation detail page shows a payment summary:
  - Total Citation Amount
  - Total Paid
  - Remaining Balance
  - Number of Payments

**Important Notes:**
- A citation can have multiple payments (partial payments allowed)
- Payment status can be updated to `COMPLETED` when processed
- Citation status may be updated to `PAID` when fully paid

---

## 6. Document Management Flow

### Step 1: Upload a Document
**Location:** `/documents/new?entityType=[type]&entityId=[id]`

**Process:**
1. User navigates to document upload form
   - Entity type and ID can be pre-filled from entity detail pages
   - Supported entity types:
     - `Citation`
     - `Case`
     - `Hearing`
     - `Payment`

2. User fills out document form:
   - **Entity Type** (required) - select the entity type
   - **Entity** (required) - select the specific entity
   - **File** (required) - upload file (PDF, images, Word docs, etc.)
     - Max size: 10MB
   - **Description** (optional)

3. System:
   - Validates file type and size
   - Uploads file to storage (currently local file system)
   - Creates document record in database
   - Links document to the entity

4. Document is available on the entity detail page

**Important Notes:**
- Documents are stored with tenant isolation
- File path format: `storage/[tenantId]/[entityType]/[entityId]/[filename]`
- Documents can be viewed and downloaded from entity detail pages

---

## Complete Workflow Example

### Scenario: Parking Citation with Dispute

1. **Create Citation**
   - Officer creates citation for parking violation
   - Citation status: `PENDING`
   - Citation number: `CIT-2024-00001`

2. **Add Violations**
   - Officer adds violation: "Parking in No Parking Zone"
   - Fine: $50.00
   - Violation is linked to citation

3. **Issue Citation**
   - Citation status updated to `ISSUED`
   - Citation sent to violator

4. **Violator Disputes**
   - Violator disputes the citation
   - Case created: `CASE-2024-00001`
   - Case type: `DISPUTE`
   - Case linked to citation
   - Case status: `OPEN`

5. **Schedule Hearing**
   - Hearing scheduled for case
   - Hearing type: "Initial Hearing"
   - Scheduled date: Next week
   - Hearing status: `SCHEDULED`

6. **Upload Documents**
   - Officer uploads photos of violation
   - Documents linked to citation
   - Violator uploads evidence
   - Documents linked to case

7. **Hearing Completed**
   - Hearing held
   - Hearing status: `COMPLETED`
   - Outcome: "Citation upheld"
   - Case status: `CLOSED`

8. **Payment Processing**
   - Violator pays fine
   - Payment recorded: $50.00
   - Payment method: `ONLINE`
   - Payment status: `COMPLETED`
   - Citation status: `PAID`

---

## Key Features

### Multi-Tenant Isolation
- All data is scoped to tenants
- Users can only access data from their tenant
- Database queries automatically filter by `tenantId`

### Status Management
- Citations, cases, hearings, and payments have status fields
- Status transitions are tracked
- Status determines workflow progression

### Audit Logging
- All GraphQL operations are logged
- Logs include:
  - User ID
  - Tenant ID
  - Action type
  - Resource
  - Timestamp
  - Success/failure

### File Storage
- Documents stored with tenant isolation
- Storage provider abstraction (currently local, can switch to S3/cloud)
- File size limits: 10MB

---

## Navigation Paths

### From Citation Detail Page:
- **Add Violation:** `/citations/[id]/violations/new`
- **New Case:** `/cases/new?citationId=[id]`
- **Upload Document:** `/documents/new?entityType=Citation&entityId=[id]`
- **Record Payment:** `/payments/new?citationId=[id]`

### From Case Detail Page:
- **Schedule Hearing:** `/hearings/new?caseId=[id]`
- **Upload Document:** `/documents/new?entityType=Case&entityId=[id]`
- **View Citation:** `/citations/[id]` (if linked)

### From Hearing Detail Page:
- **Upload Document:** `/documents/new?entityType=Hearing&entityId=[id]`
- **View Case:** `/cases/[id]`

---

## Database Schema Summary

### Citation
- One citation can have many violations
- One citation can have many cases
- One citation can have many payments
- One citation can have many documents

### Violation
- Belongs to one citation (required)
- Has violation code, description, fine amount, points

### Case
- Can belong to one citation (optional)
- Can have many hearings
- Can have many documents

### Hearing
- Belongs to one case (required)
- Has scheduled date, location, type, status, outcome

### Payment
- Belongs to one citation (required)
- Has amount, payment method, transaction ID, status

### Document
- Belongs to one entity (Citation, Case, Hearing, or Payment)
- Has file path, file name, file type, file size

---

## Status Values

### Citation Status
- `PENDING` - Citation created but not yet issued
- `ISSUED` - Citation has been issued to violator
- `PAID` - Citation has been fully paid
- `DISPUTED` - Citation is being disputed
- `DISMISSED` - Citation has been dismissed
- `OVERDUE` - Citation payment is overdue

### Case Status
- `OPEN` - Case has been opened
- `IN_PROGRESS` - Case is being processed
- `SCHEDULED` - Case has scheduled hearings
- `CLOSED` - Case has been closed
- `DISMISSED` - Case has been dismissed

### Hearing Status
- `SCHEDULED` - Hearing is scheduled
- `IN_PROGRESS` - Hearing is currently in progress
- `COMPLETED` - Hearing has been completed
- `CANCELLED` - Hearing has been cancelled
- `POSTPONED` - Hearing has been postponed

### Payment Status
- `PENDING` - Payment is pending processing
- `COMPLETED` - Payment has been completed
- `FAILED` - Payment failed
- `REFUNDED` - Payment has been refunded

---

**Last Updated:** 2024-12-14
**Version:** 1.0

