# Frontend Development Game Plan

## Current Status ✅

### Backend (Complete)
- ✅ All 6 core business modules implemented and tested
- ✅ GraphQL API fully functional
- ✅ Authentication & authorization working
- ✅ Comprehensive testing guide available

### Frontend (Starting)
- ✅ Next.js 14 setup with App Router
- ✅ Apollo Client installed
- ✅ Tailwind CSS configured
- ✅ Basic project structure

---

## Phase 1: Foundation & Authentication 🎯

### Priority 1: Core Infrastructure

#### 1.1 Apollo Client Setup
- [ ] Create Apollo Client provider
- [ ] Configure GraphQL endpoint
- [ ] Set up authentication headers
- [ ] Add error handling
- [ ] Configure cache policies

#### 1.2 Authentication System
- [ ] Login page (`/login`)
- [ ] Auth context/provider
- [ ] Token management (localStorage/sessionStorage)
- [ ] Protected route wrapper
- [ ] Logout functionality
- [ ] Auto token refresh (if needed)

#### 1.3 Layout & Navigation
- [ ] Main app layout with sidebar
- [ ] Navigation menu
- [ ] User profile dropdown
- [ ] Responsive design
- [ ] Loading states

---

## Phase 2: Core Business Modules 🎯

### Priority 2: Citations Module

#### 2.1 Citations List Page (`/citations`)
- [ ] Table/list view of citations
- [ ] Filtering (status, violator name, date range)
- [ ] Search functionality
- [ ] Pagination
- [ ] Sort by columns
- [ ] Quick actions (issue, view, edit)

#### 2.2 Create Citation Page (`/citations/new`)
- [ ] Form with all citation fields
- [ ] Date pickers
- [ ] Form validation
- [ ] Submit mutation
- [ ] Success/error handling
- [ ] Redirect after creation

#### 2.3 Citation Detail Page (`/citations/[id]`)
- [ ] Display all citation information
- [ ] Related violations list
- [ ] Related payments list
- [ ] Related documents list
- [ ] Related cases list
- [ ] Status badge
- [ ] Action buttons (edit, issue, delete)
- [ ] Timeline/history view

#### 2.4 Edit Citation Page (`/citations/[id]/edit`)
- [ ] Pre-filled form
- [ ] Update mutation
- [ ] Validation
- [ ] Success handling

---

### Priority 3: Violations Module

#### 3.1 Violation Types Management (`/violations/types`)
- [ ] List violation types
- [ ] Create violation type form
- [ ] Edit violation type
- [ ] Toggle active/inactive
- [ ] Delete violation type

#### 3.2 Violations List (`/violations`)
- [ ] List all violations
- [ ] Filter by citation
- [ ] Filter by violation code
- [ ] View violation details

#### 3.3 Add Violation to Citation (`/citations/[id]/violations/new`)
- [ ] Form within citation detail page
- [ ] Select violation type
- [ ] Enter fine amount and points
- [ ] Submit and refresh citation

---

### Priority 4: Cases Module

#### 4.1 Cases List Page (`/cases`)
- [ ] Table/list view
- [ ] Filter by status, type, assigned to
- [ ] Search by case number
- [ ] Quick actions
- [ ] Status badges

#### 4.2 Create Case Page (`/cases/new`)
- [ ] Form to create case
- [ ] Link to citation (optional)
- [ ] Case type selection
- [ ] Description field
- [ ] Submit mutation

#### 4.3 Case Detail Page (`/cases/[id]`)
- [ ] Display case information
- [ ] Related citation (if linked)
- [ ] Related hearings list
- [ ] Related documents list
- [ ] Assignment section
- [ ] Status workflow buttons
- [ ] Close case action

#### 4.4 Assign Case (`/cases/[id]/assign`)
- [ ] User selection dropdown
- [ ] Assign mutation
- [ ] Update UI

---

### Priority 5: Hearings Module

#### 5.1 Hearings List (`/hearings`)
- [ ] Calendar view (optional)
- [ ] List view with filters
- [ ] Filter by case, status, date range
- [ ] Upcoming hearings highlight

#### 5.2 Create Hearing (`/hearings/new`)
- [ ] Form to schedule hearing
- [ ] Link to case
- [ ] Date/time picker
- [ ] Location field
- [ ] Notes field

#### 5.3 Hearing Detail (`/hearings/[id]`)
- [ ] Display hearing information
- [ ] Related case details
- [ ] Status badge
- [ ] Actions: Cancel, Postpone, Complete
- [ ] Outcome field (when completing)

---

### Priority 6: Payments Module

#### 6.1 Payments List (`/payments`)
- [ ] List all payments
- [ ] Filter by citation, status, payment method
- [ ] Date range filter
- [ ] Payment summary cards

#### 6.2 Create Payment (`/payments/new`)
- [ ] Form to record payment
- [ ] Link to citation
- [ ] Amount field
- [ ] Payment method selection
- [ ] Transaction ID (optional)
- [ ] Notes field

#### 6.3 Payment Detail (`/payments/[id]`)
- [ ] Display payment information
- [ ] Related citation details
- [ ] Status badge
- [ ] Actions: Update status, Refund
- [ ] Payment history

#### 6.4 Citation Payment Summary
- [ ] Component showing payment summary
- [ ] Total paid vs. citation amount
- [ ] Remaining balance
- [ ] Payment count
- [ ] Display in citation detail page

---

### Priority 7: Documents Module

#### 7.1 Documents List (`/documents`)
- [ ] List all documents
- [ ] Filter by entity type (Citation/Case)
- [ ] Filter by entity ID
- [ ] File type filter

#### 7.2 Upload Document
- [ ] File upload component
- [ ] Link to Citation or Case
- [ ] File type validation
- [ ] File size validation
- [ ] Upload progress
- [ ] Success/error handling

#### 7.3 Document Viewer
- [ ] Display document metadata
- [ ] Download link
- [ ] Preview (if applicable)
- [ ] Delete action

---

## Phase 3: Dashboard & Analytics 📊

### Priority 8: Dashboard

#### 8.1 Main Dashboard (`/dashboard`)
- [ ] Statistics cards:
  - Total citations
  - Open cases
  - Pending payments
  - Upcoming hearings
- [ ] Recent activity feed
- [ ] Quick actions
- [ ] Charts/graphs (optional):
  - Citations by status
  - Payments over time
  - Cases by type

---

## Phase 4: User & System Management 👥

### Priority 9: User Management

#### 9.1 Users List (`/users`)
- [ ] List all users
- [ ] Filter by role
- [ ] Search by name/email

#### 9.2 Create User (`/users/new`)
- [ ] User creation form
- [ ] Role assignment
- [ ] Tenant selection (if multi-tenant admin)

#### 9.3 User Detail (`/users/[id]`)
- [ ] User information
- [ ] Role management
- [ ] Edit user
- [ ] Delete user

---

### Priority 10: Settings & Audit

#### 10.1 Settings Page (`/settings`)
- [ ] User profile settings
- [ ] Password change
- [ ] Preferences

#### 10.2 Audit Log Viewer (`/audit`)
- [ ] List audit logs
- [ ] Filter by user, action, resource
- [ ] Date range filter
- [ ] Export functionality (optional)

---

## Technical Implementation Details

### File Structure
```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── citations/
│   │   ├── violations/
│   │   ├── cases/
│   │   ├── hearings/
│   │   ├── payments/
│   │   └── documents/
│   └── layout.tsx
├── components/
│   ├── ui/          # Reusable UI components
│   ├── forms/       # Form components
│   ├── tables/      # Table components
│   └── layout/      # Layout components
├── lib/
│   ├── apollo/      # Apollo Client setup
│   ├── auth/        # Auth utilities
│   └── utils/       # Helper functions
├── hooks/           # Custom React hooks
├── types/           # TypeScript types
└── graphql/         # GraphQL queries/mutations
```

### Key Technologies
- **Apollo Client**: GraphQL client
- **React Query**: Additional data fetching (if needed)
- **Zod**: Form validation
- **Tailwind CSS**: Styling
- **Next.js 14 App Router**: Routing

### Component Patterns
- **Server Components**: Default for static content
- **Client Components**: For interactivity, forms, state
- **Shared Components**: Reusable UI elements
- **Layout Components**: Navigation, sidebar, header

---

## Development Approach

### For Each Module:

1. **GraphQL Integration**
   - Create queries/mutations in `graphql/` folder
   - Generate TypeScript types (if using codegen)
   - Test queries in GraphQL Playground first

2. **Page Components**
   - Create page in `app/` directory
   - Use Server Components for data fetching (if possible)
   - Use Client Components for interactivity

3. **Forms**
   - Use Zod for validation
   - Handle loading/error states
   - Show success messages
   - Redirect after success

4. **Lists/Tables**
   - Implement pagination
   - Add filtering/search
   - Add sorting
   - Show loading skeletons

5. **Detail Pages**
   - Fetch data on page load
   - Display all related entities
   - Add action buttons
   - Handle mutations

6. **Testing**
   - Test each page manually
   - Verify GraphQL queries work
   - Test error handling
   - Test responsive design

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Apollo Client setup
- [ ] Authentication system
- [ ] Layout & navigation
- [ ] Protected routes

### Phase 2: Core Modules
- [ ] Citations module (list, create, detail, edit)
- [ ] Violations module (types, list, create)
- [ ] Cases module (list, create, detail, assign)
- [ ] Hearings module (list, create, detail, actions)
- [ ] Payments module (list, create, detail, refund)
- [ ] Documents module (list, upload, view)

### Phase 3: Dashboard
- [ ] Dashboard page
- [ ] Statistics cards
- [ ] Recent activity
- [ ] Quick actions

### Phase 4: Management
- [ ] User management
- [ ] Settings page
- [ ] Audit log viewer

---

## Next Steps

1. **Start with Phase 1**: Set up Apollo Client and authentication
2. **Then Phase 2**: Build core business modules in priority order
3. **Then Phase 3**: Add dashboard and analytics
4. **Finally Phase 4**: User management and settings

---

## Notes

- **Authentication First**: Must be completed before any protected pages
- **Mobile Responsive**: Design mobile-first, ensure all pages work on mobile
- **Error Handling**: Consistent error messages and handling across all pages
- **Loading States**: Show loading indicators for all async operations
- **Form Validation**: Client-side validation before submission
- **Success Feedback**: Clear success messages after mutations

---

**Ready to start frontend development! 🚀**
