# Testing Different File Types

This guide shows how to test file upload with various file types.

## Quick Test Guide

### Method 1: Manual Testing via UI (Recommended)

1. **Start Servers:**
   ```powershell
   # Terminal 1 - Backend
   cd apps/api
   npm run dev

   # Terminal 2 - Frontend
   cd apps/web
   npm run dev
   ```

2. **Login:**
   - Open: http://localhost:3000
   - Login with your credentials

3. **Create Test Entity:**
   - Create a Citation: http://localhost:3000/citations/new
   - OR create a Case: http://localhost:3000/cases/new
   - Note the ID from the URL

4. **Test Each File Type:**

#### Test 1: Text File (.txt)
- Go to: http://localhost:3000/documents/new
- Select entity type and entity
- Upload: `apps/api/test-files/test-document.txt`
- ✅ Should upload successfully

#### Test 2: PDF File (.pdf)
- Create or find a PDF file (< 10MB)
- Upload via UI
- ✅ Should upload successfully
- ✅ Should download correctly

#### Test 3: JPEG Image (.jpg)
- Use any JPG image
- Upload via UI
- ✅ Should upload successfully
- ✅ Should display/download correctly

#### Test 4: PNG Image (.png)
- Use any PNG image
- Upload via UI
- ✅ Should upload successfully

#### Test 5: Word Document (.docx)
- Create or use a Word document
- Upload via UI
- ✅ Should upload successfully

---

## Test File Types Checklist

### ✅ Allowed File Types (Should Work)

- [ ] **Text Files** (.txt)
  - MIME: `text/plain`
  - Test file: `test-document.txt` (already created)

- [ ] **PDF Documents** (.pdf)
  - MIME: `application/pdf`
  - Create a simple PDF or use any PDF file

- [ ] **JPEG Images** (.jpg, .jpeg)
  - MIME: `image/jpeg`
  - Use any JPG image

- [ ] **PNG Images** (.png)
  - MIME: `image/png`
  - Use any PNG image

- [ ] **GIF Images** (.gif)
  - MIME: `image/gif`
  - Use any GIF image

- [ ] **Word Documents** (.doc)
  - MIME: `application/msword`
  - Use Word 97-2003 format

- [ ] **Word Documents** (.docx)
  - MIME: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Use modern Word format

### ❌ Invalid File Types (Should Fail)

- [ ] **Executable Files** (.exe, .bat, .sh)
  - Should show error: "File type not allowed"

- [ ] **Archive Files** (.zip, .rar, .7z)
  - Should show error: "File type not allowed"

- [ ] **Video Files** (.mp4, .avi, .mov)
  - Should show error: "File type not allowed"

- [ ] **Audio Files** (.mp3, .wav)
  - Should show error: "File type not allowed"

- [ ] **Script Files** (.js, .py, .php)
  - Should show error: "File type not allowed"

---

## File Size Testing

### Test Different File Sizes

1. **Small Files (< 1MB)**
   - ✅ Should upload quickly
   - ✅ Should work perfectly

2. **Medium Files (1-5MB)**
   - ✅ Should upload successfully
   - ✅ May take a few seconds

3. **Large Files (5-10MB)**
   - ✅ Should upload successfully
   - ✅ May take longer

4. **Oversized Files (> 10MB)**
   - ❌ Should show error: "File size exceeds 10MB limit"
   - ❌ Should not upload

---

## Creating Test Files

### Text File
✅ Already created: `apps/api/test-files/test-document.txt`

### PDF File
**Option 1: Online Tool**
- Go to https://www.ilovepdf.com/create-pdf
- Create a simple PDF
- Save to `apps/api/test-files/test-document.pdf`

**Option 2: Microsoft Word**
- Create document in Word
- Save as PDF
- Copy to `apps/api/test-files/`

### Image Files
**Option 1: Screenshot**
- Take screenshot (Win + Shift + S)
- Save as `test-image.jpg` or `test-image.png`
- Copy to `apps/api/test-files/`

**Option 2: Download**
- Download a small image from internet
- Copy to `apps/api/test-files/`

### Word Document
**Option 1: Microsoft Word**
- Create new document
- Add some text
- Save as `test-document.docx`
- Copy to `apps/api/test-files/`

**Option 2: Google Docs**
- Create document
- Download as .docx
- Copy to `apps/api/test-files/`

---

## Testing Checklist

### Basic Functionality
- [ ] Upload text file (.txt)
- [ ] Upload PDF file (.pdf)
- [ ] Upload JPEG image (.jpg)
- [ ] Upload PNG image (.png)
- [ ] Upload Word document (.docx)
- [ ] Download each file type
- [ ] Delete each file type

### Validation Tests
- [ ] Try uploading .exe file (should fail)
- [ ] Try uploading .zip file (should fail)
- [ ] Try uploading file > 10MB (should fail)
- [ ] Try uploading without selecting file (should show error)
- [ ] Try uploading without selecting entity (should show error)

### Integration Tests
- [ ] Upload file from citation detail page
- [ ] Upload file from case detail page
- [ ] Verify file appears in entity's documents list
- [ ] Verify file is linked to correct entity

### Security Tests
- [ ] Try uploading file with malicious filename
- [ ] Verify files are organized by tenant
- [ ] Verify authentication is required

---

## Expected Results

### Successful Upload
- ✅ File uploads without errors
- ✅ Redirects to document detail page
- ✅ File appears in documents list
- ✅ File exists in `apps/api/uploads/` directory
- ✅ File path in database is correct

### Successful Download
- ✅ Download button works
- ✅ File downloads with correct name
- ✅ File opens correctly
- ✅ File content is not corrupted

### Successful Delete
- ✅ Delete confirmation appears
- ✅ File is removed from database
- ✅ Physical file is deleted from storage
- ✅ Document no longer appears in list

### Validation Errors
- ✅ Clear error messages
- ✅ No crashes
- ✅ Form remains usable after error

---

## Quick Test Commands

### Check Upload Directory
```powershell
# View uploaded files
Get-ChildItem -Recurse apps/api/uploads/

# Count files
(Get-ChildItem -Recurse apps/api/uploads/ -File).Count
```

### Check Database
```powershell
# Using Prisma Studio
cd apps/api
npm run prisma:studio
```

---

## Troubleshooting

### File Not Uploading
1. Check backend is running
2. Check browser console for errors
3. Check backend terminal for errors
4. Verify authentication token
5. Check file size and type

### File Not Downloading
1. Check file exists in uploads directory
2. Check file path in database
3. Verify download endpoint is working
4. Check file permissions

### Validation Not Working
1. Check file type validation in frontend
2. Check file size validation
3. Verify backend validation is working
4. Check error messages are displayed

---

## Test Results Template

```
Date: ___________
Tester: ___________

File Type Tests:
- [ ] Text (.txt) - Result: ___________
- [ ] PDF (.pdf) - Result: ___________
- [ ] JPEG (.jpg) - Result: ___________
- [ ] PNG (.png) - Result: ___________
- [ ] Word (.docx) - Result: ___________

Validation Tests:
- [ ] Invalid file type - Result: ___________
- [ ] File > 10MB - Result: ___________

Integration Tests:
- [ ] Citation upload - Result: ___________
- [ ] Case upload - Result: ___________

Issues Found:
1. ___________
2. ___________

Overall Status: ✅ Pass / ❌ Fail
```

---

**Ready to test!** Start with the text file and work through each file type.

