# Complete File Types Testing Guide

## ✅ What's Been Tested

1. **Text File (.txt)** - ✅ **WORKING**
   - File: `test-document.txt`
   - Upload: ✅ Success
   - Download: ✅ Success
   - Delete: ✅ Success

2. **Second File Upload** - ✅ **WORKING**
   - Multiple uploads working correctly

## 📋 File Types Ready to Test

### PDF File
- **File:** `apps/api/test-files/test-document.pdf`
- **Type:** `application/pdf`
- **Status:** File created, ready to test
- **Test Command:**
  ```powershell
  cd apps/api
  node test-single-file.js test-document.pdf application/pdf
  ```
- **Or via UI:** Upload the PDF file from the documents page

### Image Files (Need Real Files)
- **Files:** `test-image.jpg`, `test-image.png` (currently fake)
- **Types:** `image/jpeg`, `image/png`
- **Status:** Need real image files
- **How to get:**
  - Take screenshot (Win + Shift + S)
  - Save as JPG or PNG
  - Copy to `apps/api/test-files/`
- **Test:** Upload via UI or test script

### Word Document (Need Real File)
- **File:** `test-document.docx` (currently fake)
- **Type:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Status:** Need real .docx file
- **How to get:**
  - Create in Microsoft Word or Google Docs
  - Save as .docx
  - Copy to `apps/api/test-files/`
- **Test:** Upload via UI or test script

## 🧪 Testing Methods

### Method 1: UI Testing (Easiest)

1. **Start servers:**
   ```powershell
   # Terminal 1
   cd apps/api
   npm run dev

   # Terminal 2
   cd apps/web
   npm run dev
   ```

2. **Login:** http://localhost:3000
   - Email: `admin@example.com`
   - Password: `admin123`

3. **Upload files:**
   - Go to: http://localhost:3000/documents/new
   - Select Citation or Case
   - Upload file
   - Verify success

### Method 2: Test Script

**Test single file:**
```powershell
cd apps/api
node test-single-file.js <filename> <mime-type>
```

**Examples:**
```powershell
# Test PDF
node test-single-file.js test-document.pdf application/pdf

# Test text (already working)
node test-single-file.js test-document.txt text/plain
```

## ✅ Allowed File Types

These file types are accepted by the system:

| Type | Extensions | MIME Type | Test Status |
|------|------------|-----------|-------------|
| Text | .txt | text/plain | ✅ Tested |
| PDF | .pdf | application/pdf | ⏳ Ready |
| JPEG | .jpg, .jpeg | image/jpeg | ⏳ Need real file |
| PNG | .png | image/png | ⏳ Need real file |
| GIF | .gif | image/gif | ⏳ Need real file |
| Word (old) | .doc | application/msword | ⏳ Need real file |
| Word (new) | .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | ⏳ Need real file |

## ❌ Invalid File Types (Should Be Rejected)

These should fail validation:
- `.exe`, `.bat`, `.sh` - Executables
- `.zip`, `.rar`, `.7z` - Archives
- `.mp4`, `.avi` - Videos
- `.mp3`, `.wav` - Audio
- `.js`, `.py`, `.php` - Scripts

## 📊 Test Checklist

### Valid File Types
- [x] Text file (.txt) - ✅ Working
- [ ] PDF file (.pdf) - ⏳ Ready to test
- [ ] JPEG image (.jpg) - ⏳ Need real file
- [ ] PNG image (.png) - ⏳ Need real file
- [ ] Word document (.docx) - ⏳ Need real file

### Validation Tests
- [ ] Invalid file type (.exe) - Should be rejected
- [ ] Invalid file type (.zip) - Should be rejected
- [ ] File > 10MB - Should be rejected
- [ ] Empty file - Should be rejected

### Functionality Tests
- [x] Upload - ✅ Working
- [x] Download - ✅ Working
- [x] Delete - ✅ Working
- [x] Multiple files - ✅ Working
- [ ] File preview - ⏳ Future enhancement

## 🎯 Quick Test Commands

```powershell
# Navigate to API directory
cd apps/api

# Test PDF (file exists)
node test-single-file.js test-document.pdf application/pdf

# Test text (already working)
node test-single-file.js test-document.txt text/plain

# Test all files
node test-all-file-types.js
```

## 📁 Test Files Location

All test files are in: `apps/api/test-files/`

- ✅ `test-document.txt` - Working
- ✅ `test-document.pdf` - Created, ready to test
- ⚠️ `test-image.jpg` - Fake file, need real image
- ⚠️ `test-image.png` - Fake file, need real image
- ⚠️ `test-document.docx` - Fake file, need real Word doc

## 🔍 Verify Results

After uploading, check:

1. **Uploads directory:**
   ```powershell
   Get-ChildItem -Recurse apps\api\uploads\
   ```

2. **Documents in UI:**
   - http://localhost:3000/documents

3. **Database:**
   ```powershell
   cd apps/api
   npm run prisma:studio
   ```

## 📝 Test Results Template

```
Date: ___________

File Type Tests:
- [x] Text (.txt) - ✅ PASS
- [ ] PDF (.pdf) - Result: ___________
- [ ] JPEG (.jpg) - Result: ___________
- [ ] PNG (.png) - Result: ___________
- [ ] Word (.docx) - Result: ___________

Validation Tests:
- [ ] Invalid type (.exe) - Result: ___________
- [ ] Large file (>10MB) - Result: ___________

Overall: ✅ All working / ⚠️ Some issues / ❌ Problems found
```

---

**Current Status:** Text files working perfectly. PDF ready to test. Need real image and Word files for complete testing.

**Recommendation:** Test PDF file next, then add real image/Word files as you get them.

