# File Upload Testing Guide

## Pre-Testing Checklist

### 1. Environment Setup
- [ ] Backend API is running (`npm run dev:api` or `cd apps/api && npm run dev`)
- [ ] Frontend is running (`npm run dev:web` or `cd apps/web && npm run dev`)
- [ ] Database is accessible
- [ ] User is logged in (need authentication token)

### 2. Environment Variables
Check `apps/api/.env` (or create if doesn't exist):
```env
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

### 3. Upload Directory
- [ ] `apps/api/uploads/` directory will be created automatically
- [ ] Verify write permissions

---

## Test Cases

### Test 1: Basic File Upload ✅

**Steps:**
1. Navigate to `http://localhost:3000/documents/new`
2. Select entity type: "Citation" or "Case"
3. Select an entity (create one if none exist)
4. Click "Upload a file" or drag & drop a file
5. Select a test file (PDF, image, or Word doc)
6. Add optional description
7. Click "Upload Document"

**Expected Results:**
- ✅ File uploads successfully
- ✅ Success message or redirect to document detail page
- ✅ File appears in documents list
- ✅ File is saved in `apps/api/uploads/{tenantId}/{entityType}/{entityId}/{timestamp}-{filename}`

**Test Files to Use:**
- Small PDF (< 1MB)
- JPEG image
- PNG image
- Word document (.docx)
- Text file (.txt)

---

### Test 2: File Type Validation ✅

**Steps:**
1. Try uploading an invalid file type (e.g., `.exe`, `.zip`, `.mp4`)
2. Try uploading without selecting a file

**Expected Results:**
- ✅ Error message: "File type not allowed"
- ✅ Upload button is disabled when no file selected
- ✅ Form validation prevents submission

---

### Test 3: File Size Validation ✅

**Steps:**
1. Try uploading a file larger than 10MB
2. Upload a file exactly 10MB
3. Upload a file smaller than 10MB

**Expected Results:**
- ✅ Error message for files > 10MB: "File size exceeds 10MB limit"
- ✅ Files ≤ 10MB upload successfully
- ✅ Frontend validation shows error before upload

---

### Test 4: File Download ✅

**Steps:**
1. Navigate to a document detail page (`/documents/{id}`)
2. Click "Download" button
3. Verify file downloads

**Expected Results:**
- ✅ Download button is visible
- ✅ File downloads with correct filename
- ✅ File content is correct (not corrupted)
- ✅ File type matches original

---

### Test 5: File Deletion ✅

**Steps:**
1. Navigate to a document detail page
2. Click "Delete" button
3. Confirm deletion
4. Check uploads directory

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Document is deleted from database
- ✅ Physical file is removed from `uploads/` directory
- ✅ Redirect to documents list
- ✅ Document no longer appears in list

---

### Test 6: Multiple Files ✅

**Steps:**
1. Upload multiple files to the same entity
2. Upload files to different entities
3. Check file organization in uploads directory

**Expected Results:**
- ✅ Multiple files can be uploaded
- ✅ Files are organized by tenant/entity
- ✅ Each file has unique timestamp
- ✅ All files appear in documents list

---

### Test 7: Error Handling ✅

**Test Scenarios:**
1. **Network Error:**
   - Stop backend server
   - Try to upload file
   - Expected: Error message displayed

2. **Invalid Entity:**
   - Try to upload to non-existent entity
   - Expected: Error message

3. **Unauthorized:**
   - Log out
   - Try to access upload endpoint directly
   - Expected: 401 Unauthorized

**Expected Results:**
- ✅ User-friendly error messages
- ✅ No crashes or blank screens
- ✅ Error state is recoverable

---

### Test 8: File Path Security ✅

**Steps:**
1. Try uploading file with malicious filename: `../../../etc/passwd`
2. Try uploading file with special characters: `file<script>.pdf`

**Expected Results:**
- ✅ Filename is sanitized
- ✅ Path traversal is prevented
- ✅ File is saved with safe filename

---

### Test 9: Integration with Citations/Cases ✅

**Steps:**
1. Navigate to a citation detail page
2. Click "Upload Document" link
3. Upload a file
4. Verify file appears in citation's documents list
5. Repeat for cases

**Expected Results:**
- ✅ Pre-filled entity type and ID
- ✅ File is linked to correct entity
- ✅ File appears in entity's documents section

---

### Test 10: Storage Directory Structure ✅

**Steps:**
1. Upload a few files
2. Check `apps/api/uploads/` directory structure

**Expected Results:**
- ✅ Directory structure: `uploads/{tenantId}/{entityType}/{entityId}/{timestamp}-{filename}`
- ✅ Files are organized correctly
- ✅ No files in root uploads directory

---

## Manual Testing Checklist

### Frontend Tests
- [ ] Upload form displays correctly
- [ ] File selection works (click and drag & drop)
- [ ] File preview shows selected file name and size
- [ ] Validation errors display correctly
- [ ] Loading state shows during upload
- [ ] Success redirect works
- [ ] Download link works
- [ ] Delete confirmation works

### Backend Tests
- [ ] Upload endpoint accepts multipart/form-data
- [ ] Authentication is required
- [ ] File is saved to correct location
- [ ] Database record is created
- [ ] Download endpoint serves file correctly
- [ ] Delete removes both file and database record
- [ ] Tenant isolation works (users can't access other tenant's files)

### Integration Tests
- [ ] Upload from citation detail page
- [ ] Upload from case detail page
- [ ] Files appear in entity's document list
- [ ] Files can be downloaded from entity detail page

---

## Testing Tools

### Browser DevTools
- **Network Tab:** Check upload request/response
- **Console:** Check for errors
- **Application Tab:** Check localStorage for auth token

### Backend Logs
Watch for:
- `Upload directory ready: ./uploads`
- `File uploaded: uploads/...`
- `File deleted: uploads/...`

### File System
Check `apps/api/uploads/` directory:
```bash
# Windows PowerShell
Get-ChildItem -Recurse apps/api/uploads/

# Or navigate to the directory
cd apps/api/uploads
dir /s
```

---

## Common Issues & Solutions

### Issue: "Upload directory not found"
**Solution:** Check `UPLOAD_DIR` environment variable, ensure directory is writable

### Issue: "File upload fails silently"
**Solution:** 
- Check browser console for errors
- Check backend logs
- Verify authentication token is valid
- Check CORS settings

### Issue: "File downloads but is corrupted"
**Solution:** 
- Check file was uploaded correctly
- Verify file path in database
- Check download endpoint implementation

### Issue: "File not deleted from storage"
**Solution:** 
- Check file path in database
- Verify storage service deleteFile method
- Check file permissions

---

## Test Data

### Create Test Entities

Before testing, ensure you have:
1. **At least one Citation:**
   - Navigate to `/citations/new`
   - Create a test citation

2. **At least one Case:**
   - Navigate to `/cases/new`
   - Create a test case

### Test Files

Create or use these test files:
- `test-document.pdf` (small PDF, < 1MB)
- `test-image.jpg` (small image)
- `test-document.docx` (Word document)
- `test-file.txt` (text file)

---

## Automated Testing (Future)

For automated testing, consider:
- Unit tests for storage service
- Integration tests for upload endpoint
- E2E tests with Playwright/Cypress
- File system mocking

---

## Success Criteria

✅ All test cases pass
✅ Files upload successfully
✅ Files download correctly
✅ Files delete properly
✅ Error handling works
✅ Security validations work
✅ Integration with entities works

---

**Ready to test!** Start with Test 1 and work through the checklist.

