# File Types Testing Guide

## Quick Start

### Test PDF File (Ready Now)

**Option 1: Via UI (Recommended)**
1. Open: http://localhost:3000/documents/new
2. Select a Citation or Case
3. Click "Choose File"
4. Navigate to: `apps/api/test-files/test-document.pdf`
5. Click "Upload"
6. ✅ Should see success message

**Option 2: Via Script**
```powershell
cd apps/api
node test-single-file.js test-document.pdf application/pdf
```

## Current Test Files

| File | Size | Status | Notes |
|------|------|--------|-------|
| test-document.txt | 277 bytes | ✅ Real | Working |
| test-document.pdf | 628 bytes | ⏳ Test | Minimal PDF, should work |
| test-image.jpg | 149 bytes | ⚠️ Fake | Need real image (>1KB) |
| test-image.png | 148 bytes | ⚠️ Fake | Need real image (>1KB) |
| test-document.docx | 232 bytes | ⚠️ Fake | Need real Word doc (>5KB) |

## Adding Real Files for Testing

### Add Real Image File

**Method 1: Screenshot (Easiest)**
1. Press `Win + Shift + S` (Windows screenshot tool)
2. Select area to capture
3. Click "Save" icon
4. Save as: `apps/api/test-files/test-image.jpg`
5. Upload via UI

**Method 2: Download Image**
1. Find a small image online (< 1MB)
2. Right-click → Save As
3. Save to: `apps/api/test-files/test-image.jpg` or `.png`
4. Upload via UI

**Method 3: Use Existing Image**
1. Find any JPG/PNG on your computer
2. Copy to: `apps/api/test-files/`
3. Rename if needed
4. Upload via UI

### Add Real Word Document

**Method 1: Microsoft Word**
1. Open Microsoft Word
2. Create new document
3. Type: "Test document for file upload"
4. File → Save As
5. Choose location: `apps/api/test-files/`
6. Name: `test-document.docx`
7. Upload via UI

**Method 2: Google Docs**
1. Go to Google Docs
2. Create new document
3. Add some text
4. File → Download → Microsoft Word (.docx)
5. Save to: `apps/api/test-files/test-document.docx`
6. Upload via UI

**Method 3: Use Existing Document**
1. Find any .docx file on your computer
2. Copy to: `apps/api/test-files/`
3. Rename if needed
4. Upload via UI

## Testing Checklist

### PDF File
- [ ] Upload PDF file
- [ ] Verify it appears in documents list
- [ ] Download the PDF
- [ ] Verify PDF opens correctly
- [ ] Check file type is shown as "PDF"

### Image Files (After Adding Real Files)
- [ ] Upload JPG image
- [ ] Verify it appears in documents list
- [ ] Download the image
- [ ] Verify image displays correctly
- [ ] Upload PNG image
- [ ] Verify PNG works

### Word Document (After Adding Real File)
- [ ] Upload Word document
- [ ] Verify it appears in documents list
- [ ] Download the document
- [ ] Verify it opens in Word
- [ ] Check file type is shown correctly

### Validation Testing
- [ ] Try uploading .exe file (should fail)
- [ ] Try uploading .zip file (should fail)
- [ ] Verify error message is clear
- [ ] Try uploading very large file (>10MB) (should fail)

## Expected Results

### ✅ Successful Upload
- File appears in documents list
- File can be downloaded
- File can be deleted
- File type is displayed correctly
- File size is shown correctly

### ❌ Rejected Upload
- Clear error message displayed
- File not saved
- No database record created
- Error explains why it was rejected

## File Type Support

**Accepted:**
- ✅ Text files (.txt)
- ✅ PDF files (.pdf)
- ✅ JPEG images (.jpg, .jpeg)
- ✅ PNG images (.png)
- ✅ GIF images (.gif)
- ✅ Word documents (.doc, .docx)

**Rejected:**
- ❌ Executables (.exe, .bat, .sh)
- ❌ Archives (.zip, .rar, .7z)
- ❌ Videos (.mp4, .avi, .mov)
- ❌ Audio (.mp3, .wav, .mp4)
- ❌ Scripts (.js, .py, .php)

## File Size Limits

- **Maximum:** 10MB
- **Recommended:** < 5MB for best performance

## Troubleshooting

### "File type not allowed"
- Check the file extension
- Verify the file is actually the type it claims
- Check the allowed types list above

### "File size exceeds limit"
- File must be under 10MB
- Compress or resize the file if needed

### Upload fails
- Check browser console (F12) for errors
- Check backend terminal for errors
- Verify you're logged in
- Try refreshing the page

---

**Ready to test!** Start with the PDF file, then add real images and Word documents as you get them.

