# Quick File Upload Test Guide

## 🚀 Quick Start Testing

### Step 1: Start Servers

**Terminal 1 - Backend:**
```powershell
cd apps/api
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd apps/web
npm run dev
```

### Step 2: Verify Setup

1. **Check Backend is Running:**
   - Open: http://localhost:3001/graphql
   - Should see GraphQL Playground

2. **Check Frontend is Running:**
   - Open: http://localhost:3000
   - Should see login page

3. **Login:**
   - Use test credentials (check backend seed data)
   - Default: Usually `admin@example.com` / `password`

### Step 3: Create Test Data (if needed)

**Create a Citation:**
1. Navigate to: http://localhost:3000/citations/new
2. Fill in required fields
3. Save citation
4. Note the citation ID from the URL

**OR Create a Case:**
1. Navigate to: http://localhost:3000/cases/new
2. Fill in required fields
3. Save case
4. Note the case ID from the URL

### Step 4: Test File Upload

1. **Navigate to Upload Page:**
   - Go to: http://localhost:3000/documents/new
   - OR from a citation/case detail page, click "Upload Document"

2. **Fill in Form:**
   - Select Entity Type: "Citation" or "Case"
   - Select the entity you created
   - Click "Upload a file"
   - Select a test file (PDF, image, or Word doc)
   - Add description (optional)
   - Click "Upload Document"

3. **Verify Success:**
   - ✅ Should redirect to document detail page
   - ✅ Document should appear in documents list
   - ✅ File should be in `apps/api/uploads/` directory

### Step 5: Test File Download

1. **From Document Detail Page:**
   - Click "Download" button
   - File should download
   - Verify file opens correctly

### Step 6: Test File Deletion

1. **From Document Detail Page:**
   - Click "Delete" button
   - Confirm deletion
   - Should redirect to documents list
   - File should be removed from `apps/api/uploads/`

---

## ✅ Test Checklist

### Basic Functionality
- [ ] Can upload a PDF file
- [ ] Can upload an image (JPG/PNG)
- [ ] Can upload a Word document
- [ ] File appears in documents list
- [ ] Can download uploaded file
- [ ] Can delete uploaded file
- [ ] File is removed from storage when deleted

### Validation
- [ ] Error shown for files > 10MB
- [ ] Error shown for invalid file types
- [ ] Error shown when no file selected
- [ ] Error shown when entity not selected

### Integration
- [ ] Can upload from citation detail page
- [ ] Can upload from case detail page
- [ ] Uploaded file appears in entity's documents list
- [ ] File is linked to correct entity

### Security
- [ ] Must be logged in to upload
- [ ] Files are organized by tenant
- [ ] Can't access other tenant's files

---

## 🐛 Troubleshooting

### Issue: "Upload fails"
**Check:**
1. Backend server is running
2. Check browser console for errors
3. Check backend terminal for errors
4. Verify authentication token is valid

### Issue: "File not found"
**Check:**
1. File exists in `apps/api/uploads/` directory
2. File path in database is correct
3. Check backend logs for file path

### Issue: "Permission denied"
**Check:**
1. `apps/api/uploads/` directory is writable
2. Check file permissions
3. Try creating directory manually: `mkdir apps/api/uploads`

---

## 📁 Check Upload Directory

**Windows PowerShell:**
```powershell
cd apps/api
Get-ChildItem -Recurse uploads/
```

**Expected Structure:**
```
uploads/
  {tenantId}/
    citation/
      {citationId}/
        {timestamp}-{filename}
    case/
      {caseId}/
        {timestamp}-{filename}
```

---

## 🎯 Success Criteria

✅ File uploads successfully
✅ File downloads correctly  
✅ File deletes properly
✅ Files organized correctly
✅ Validation works
✅ Integration works

**If all checkboxes are checked, file upload is working! 🎉**

