# Input Text Color Fix

## Issue

Input boxes had light text color that was hard to read.

## Fix Applied

### 1. Global CSS Update

**File:** `apps/web/src/app/globals.css`

Added global styles to make all input, select, and textarea elements have darker text:

```css
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="tel"],
input[type="date"],
input[type="datetime-local"],
input[type="file"],
select,
textarea {
  color: #111827; /* text-gray-900 */
}

input::placeholder,
textarea::placeholder {
  color: #9ca3af; /* text-gray-400 */
}
```

### 2. Updated Documents Page

**File:** `apps/web/src/app/(dashboard)/documents/new/page.tsx`

Added `text-gray-900` class to all select elements and textarea to ensure darker text.

## Result

- ✅ All input boxes now have darker, more readable text
- ✅ Placeholder text remains lighter for contrast
- ✅ Applies to all input types across the application
- ✅ Better readability and user experience

---

**Status:** ✅ Fixed - Input text is now darker and more readable

