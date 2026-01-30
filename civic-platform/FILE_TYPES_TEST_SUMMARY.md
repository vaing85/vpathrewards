# File Types Testing Summary

## Test Files Created

### ✅ Ready to Test

1. **Text File** - `test-document.txt`
   - Type: `text/plain`
   - Status: ✅ Already tested and working

2. **PDF File** - `test-document.pdf`
   - Type: `application/pdf`
   - Status: ⏳ Ready to test
   - Note: Valid PDF structure created

### ⚠️ Need Real Files

3. **JPEG Image** - `test-image.jpg`
   - Type: `image/jpeg`
   - Status: ⚠️ Need real image file
   - Note: Current file is text, not binary image

4. **PNG Image** - `test-image.png`
   - Type: `image/png`
   - Status: ⚠️ Need real image file
   - Note: Current file is text, not binary image

5. **Word Document** - `test-document.docx`
   - Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - Status: ⚠️ Need real .docx file
   - Note: Current file is text, not actual Word document

## Allowed File Types (Backend Validation)

The backend accepts these MIME types:

```typescript
'application/pdf'                    // PDF files
'image/jpeg'                     // JPEG images
'image/png'                       // PNG images
'image/gif'                       // GIF images
'application/msword'              // Word .doc files
'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  // Word .docx files
'text/plain'                      // Text files
```

## Testing Methods

### Method 1: Via UI (Recommended)

1. Go to: http://localhost:3000/documents/new
2. Select entity (Citation or Case)
3. Upload file
4. Verify success

### Method 2: Via Test Script

**Test single file:**
```powershell
cd apps/api
node test-single-file.js <filename> <mime-type>
```

**Examples:**
```powershell
node test-single-file.js test-document.txt text/plain
node test-single-file.js test-document.pdf application/pdf
```

**Test all files:**
```powershell
node test-all-file-types.js
```

## Creating Real Test Files

### PDF File
✅ Already created: `test-document.pdf` (valid PDF structure)

### Image Files
**Option 1: Screenshot**
- Press `Win + Shift + S`
- Save as JPG or PNG
- Copy to `apps/api/test-files/`

**Option 2: Download**
- Download a small image from internet
- Copy to `apps/api/test-files/`

### Word Document
**Option 1: Microsoft Word**
- Create new document
- Add some text
- Save as .docx
- Copy to `apps/api/test-files/`

**Option 2: Google Docs**
- Create document
- Download as .docx
- Copy to `apps/api/test-files/`

## Validation Testing

### Test Invalid File Types

Create test files with invalid extensions:

```powershell
# Create invalid file
echo "test" > apps/api/test-files/test-invalid.exe

# Try to upload (should fail)
node test-single-file.js test-invalid.exe application/x-msdownload
```

**Expected:** Should be rejected with error message

### Test File Size Limit

Create a large file (> 10MB):

```powershell
# Create large file (if needed)
# Should fail validation
```

**Expected:** Should be rejected with "File size exceeds 10MB limit"

## Expected Results

### ✅ Valid File Types
- Upload succeeds
- File saved to `apps/api/uploads/`
- Database record created
- Can download file
- Can delete file

### ❌ Invalid File Types
- Upload rejected
- Clear error message
- File not saved
- No database record

## Quick Test Commands

```powershell
# Test text file
node test-single-file.js test-document.txt text/plain

# Test PDF file
node test-single-file.js test-document.pdf application/pdf

# Test all files
node test-all-file-types.js
```

## Current Status

- ✅ Text files - Working
- ⏳ PDF files - Ready to test (file created)
- ⏳ Images - Need real image files
- ⏳ Word docs - Need real .docx file
- ✅ Validation - Working (invalid types rejected)

---

**Next:** Test the PDF file, then add real image and Word document files for complete testing.

