# Citation Relations Fix

## Issue

GraphQL query was failing with:
```
Cannot query field "violations" on type "CitationOutput"
Cannot query field "cases" on type "CitationOutput"
```

## Root Cause

The `CitationOutput` GraphQL type didn't include the `violations` and `cases` relation fields, even though the frontend queries were trying to access them.

## Fix Applied

### 1. Added Relations to CitationOutput

**File:** `apps/api/src/modules/citations/dto/citation.output.ts`

Added:
```typescript
@Field(() => [ViolationOutput], { nullable: true })
violations?: ViolationOutput[];

@Field(() => [CaseOutput], { nullable: true })
cases?: CaseOutput[];
```

### 2. Updated Service to Include Relations

**File:** `apps/api/src/modules/citations/citations.service.ts`

Updated `findOne()` and `findByCitationNumber()` to include relations:
```typescript
include: {
  violations: true,
  cases: true,
}
```

## Result

Now when querying a citation:
- `violations` field is available and returns array of ViolationOutput
- `cases` field is available and returns array of CaseOutput
- Relations are automatically loaded from database

## Testing

The frontend query should now work:
```graphql
query GetCitation($id: String!) {
  citation(id: $id) {
    id
    citationNumber
    violations {
      id
      violationCode
      description
      fineAmount
      points
    }
    cases {
      id
      caseNumber
      caseType
      status
    }
  }
}
```

---

**Status:** ✅ Fixed - Citation relations now available in GraphQL schema

