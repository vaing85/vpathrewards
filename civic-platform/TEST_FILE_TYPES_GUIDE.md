# Testing Different File Types - Guide

## Quick Test via UI (Easiest)

### Step 1: Prepare Test Files

You'll need real files of each type:

1. **Text File** ✅ - Already have: `apps/api/test-files/test-document.txt`
2. **PDF File** - Create or use any PDF (< 10MB)
3. **Image Files** - Use real JPG/PNG images (screenshots work great)
4. **Word Document** - Create a .docx file in Word/Google Docs

### Step 2: Test Each Type

1. **Start servers** (if not running)
2. **Login** at http://localhost:3000
3. **Go to** http://localhost:3000/documents/new
4. **Select** a Citation or Case
5. **Upload** each file type
6. **Verify** it works

## File Types to Test

### ✅ Allowed Types (Should Work)

| Type | Extension | MIME Type | Test File |
|------|-----------|-----------|-----------|
| Text | .txt | text/plain | ✅ test-document.txt |
| PDF | .pdf | application/pdf | Create one |
| JPEG | .jpg, .jpeg | image/jpeg | Use screenshot |
| PNG | .png | image/png | Use screenshot |
| GIF | .gif | image/gif | Use any GIF |
| Word (old) | .doc | application/msword | Create in Word |
| Word (new) | .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Create in Word/Google Docs |

### ❌ Invalid Types (Should Fail)

| Type | Extension | Expected Result |
|------|-----------|-----------------|
| Executable | .exe, .bat | ❌ Rejected |
| Archive | .zip, .rar | ❌ Rejected |
| Video | .mp4, .avi | ❌ Rejected |
| Audio | .mp3, .wav | ❌ Rejected |
| Script | .js, .py | ❌ Rejected |

## Quick Test Checklist

### Text File (.txt)
- [ ] Upload `test-document.txt`
- [ ] Verify upload succeeds
- [ ] Download and verify content
- [ ] Delete and verify removal

### PDF File (.pdf)
- [ ] Create or find a PDF file
- [ ] Upload via UI
- [ ] Verify upload succeeds
- [ ] Download and open PDF
- [ ] Verify PDF opens correctly

### Image Files (.jpg, .png)
- [ ] Take a screenshot (Win + Shift + S)
- [ ] Save as JPG or PNG
- [ ] Upload via UI
- [ ] Verify upload succeeds
- [ ] Download and verify image displays

### Word Document (.docx)
- [ ] Create document in Word/Google Docs
- [ ] Save as .docx
- [ ] Upload via UI
- [ ] Verify upload succeeds
- [ ] Download and verify opens

### Validation Tests
- [ ] Try uploading .exe file (should fail)
- [ ] Try uploading .zip file (should fail)
- [ ] Try uploading file > 10MB (should fail)
- [ ] Verify error messages are clear

## Automated Test Script

Run the comprehensive test:

```powershell
cd apps/api
node test-all-file-types.js
```

**Note:** This will test with the files in `test-files/` directory. For real images and Word docs, you'll need to add actual files there.

## Expected Results

### Successful Uploads
- ✅ File appears in documents list
- ✅ File saved to `apps/api/uploads/` directory
- ✅ Database record created
- ✅ Can download file
- ✅ Can delete file

### Rejected Uploads
- ❌ Clear error message displayed
- ❌ File not saved
- ❌ No database record created

## Troubleshooting

### "File type not allowed"
- Check file extension matches MIME type
- Verify file is actually the type it claims to be
- Check allowed types list

### "File size exceeds limit"
- File must be < 10MB
- Compress or resize if needed

### Upload fails silently
- Check browser console for errors
- Check backend terminal for errors
- Verify authentication token is valid

---

**Ready to test!** Start with the text file, then test other types as you create/get real files.

