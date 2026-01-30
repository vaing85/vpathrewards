# Darker Input Text - Complete Application

## Fix Applied

### Global CSS Update

**File:** `apps/web/src/app/globals.css`

Updated global styles to ensure ALL input, select, and textarea elements have darker text:

```css
/* Make input text darker for better readability - applies to ALL inputs */
input,
select,
textarea {
  color: #111827 !important; /* text-gray-900 - darker text for better readability */
}

/* Placeholder text should remain lighter */
input::placeholder,
textarea::placeholder {
  color: #9ca3af !important; /* text-gray-400 */
}

/* Disabled inputs should have lighter text */
input:disabled,
select:disabled,
textarea:disabled {
  color: #6b7280 !important; /* text-gray-500 */
}
```

## Coverage

This applies to **ALL** input elements across the entire application:
- ✅ Text inputs
- ✅ Email inputs
- ✅ Password inputs
- ✅ Number inputs
- ✅ Tel inputs
- ✅ Date inputs
- ✅ Datetime-local inputs
- ✅ File inputs
- ✅ Select dropdowns
- ✅ Textareas
- ✅ All form pages
- ✅ Login page
- ✅ All dashboard pages

## Result

- ✅ **All input boxes** now have darker, more readable text (#111827 / text-gray-900)
- ✅ **Placeholder text** remains lighter for contrast (#9ca3af / text-gray-400)
- ✅ **Disabled inputs** have appropriate lighter text (#6b7280 / text-gray-500)
- ✅ **Applies globally** - no need to update individual components
- ✅ **Better readability** across the entire application

## Files Affected

The global CSS applies to all inputs in:
- Login page
- All dashboard pages
- All form pages (new/edit)
- All input components
- All search/filter inputs

---

**Status:** ✅ Complete - All input text is now darker and more readable across the entire application!

