# Testing Additional File Types - Step by Step

## Current Status

✅ **Text files (.txt)** - Working perfectly
⏳ **PDF files (.pdf)** - Ready to test
⏳ **Image files (.jpg, .png)** - Need real files
⏳ **Word documents (.docx)** - Need real files

## Method 1: Test via UI (Easiest)

### Step 1: Test PDF File

1. **Go to:** http://localhost:3000/documents/new
2. **Select:** A Citation or Case
3. **Upload:** `apps/api/test-files/test-document.pdf`
4. **Verify:** File uploads successfully
5. **Check:** File appears in documents list
6. **Test:** Download the file and verify it opens

### Step 2: Add Real Image Files

**Option A: Use Screenshot**
1. Press `Win + Shift + S` (Windows) or `Cmd + Shift + 4` (Mac)
2. Take a screenshot
3. Save it as `test-image.jpg` or `test-image.png`
4. Copy to: `apps/api/test-files/`
5. Upload via UI

**Option B: Download Image**
1. Find a small image online (< 1MB)
2. Save as `test-image.jpg` or `test-image.png`
3. Copy to: `apps/api/test-files/`
4. Upload via UI

### Step 3: Add Real Word Document

**Option A: Microsoft Word**
1. Open Microsoft Word
2. Create a new document
3. Add some text (e.g., "Test document for file upload")
4. Save as `.docx`
5. Copy to: `apps/api/test-files/test-document.docx`
6. Upload via UI

**Option B: Google Docs**
1. Create document in Google Docs
2. File → Download → Microsoft Word (.docx)
3. Copy to: `apps/api/test-files/test-document.docx`
4. Upload via UI

## Method 2: Test via Script

### Test PDF (File exists)
```powershell
cd apps/api
node test-single-file.js test-document.pdf application/pdf
```

### Test All Available Files
```powershell
cd apps/api
node test-file-types-complete.js
```

## Expected Results

### ✅ Valid File Types Should:
- Upload successfully
- Show in documents list
- Be downloadable
- Be deletable
- Have correct file type displayed

### ❌ Invalid File Types Should:
- Be rejected with clear error message
- Not be saved
- Show validation error

## File Type Validation

The system accepts:
- ✅ `text/plain` - Text files
- ✅ `application/pdf` - PDF files
- ✅ `image/jpeg` - JPEG images
- ✅ `image/png` - PNG images
- ✅ `image/gif` - GIF images
- ✅ `application/msword` - Word .doc files
- ✅ `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - Word .docx files

The system rejects:
- ❌ Executables (.exe, .bat, .sh)
- ❌ Archives (.zip, .rar, .7z)
- ❌ Videos (.mp4, .avi)
- ❌ Audio (.mp3, .wav)
- ❌ Scripts (.js, .py, .php)

## File Size Limit

- **Maximum:** 10MB
- **Recommended:** < 5MB for best performance

## Quick Test Checklist

- [ ] PDF file uploads successfully
- [ ] PDF file downloads correctly
- [ ] PDF file opens in PDF viewer
- [ ] Image file uploads successfully (when added)
- [ ] Image displays correctly (when added)
- [ ] Word document uploads successfully (when added)
- [ ] Word document opens correctly (when added)
- [ ] Invalid file type (.exe) is rejected
- [ ] Error messages are clear

## Troubleshooting

### "File type not allowed"
- Check file extension matches MIME type
- Verify file is actually the type it claims
- Check allowed types list above

### "File size exceeds limit"
- File must be < 10MB
- Compress or resize if needed

### Upload fails silently
- Check browser console for errors
- Check backend terminal for errors
- Verify authentication token is valid

---

**Next Steps:**
1. Test PDF file via UI
2. Add real image file and test
3. Add real Word document and test
4. Test validation with invalid file type

