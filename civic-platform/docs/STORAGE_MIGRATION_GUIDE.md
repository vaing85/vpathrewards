# Storage Provider Migration Guide

## Overview

The file storage system is designed with **abstraction in mind**, making it easy to switch between storage providers without changing your application code.

## Architecture

The storage system uses the **Strategy Pattern** with dependency injection:

1. **Interface**: `IStorageService` defines the contract
2. **Implementations**: Each storage provider implements the interface
3. **Module**: `StorageModule` selects the provider based on environment variable
4. **Usage**: Services inject `STORAGE_SERVICE` and use it without knowing the implementation

## Current Implementation: Local Storage

You're currently using **Local Storage** which stores files on the server's filesystem.

### Configuration

```env
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

Files are stored in: `uploads/{tenantId}/{entityType}/{entityId}/{timestamp}-{filename}`

## Switching to Cloud Storage

### Step 1: Choose Your Provider

See `docs/FILE_STORAGE_OPTIONS.md` for detailed comparison.

**Recommended:**
- **AWS S3** - Best for production, ~$2-5/month
- **Supabase Storage** - Easiest integration, $25/month
- **Google Cloud Storage** - Good alternative to S3

### Step 2: Create Storage Service Implementation

Create a new file: `apps/api/src/common/storage/s3-storage.service.ts` (or `supabase-storage.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService } from './storage.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET')!;
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    fileType: string,
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    const key = `${tenantId}/${entityType.toLowerCase()}/${entityId}/${Date.now()}-${fileName}`;
    
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: fileType,
      })
    );

    return key; // Return the S3 key
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: filePath,
        })
      );
      return true;
    } catch (error) {
      console.error('Failed to delete file from S3:', error);
      return false;
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    // Generate a signed URL for temporary access
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });
    
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return url;
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: filePath,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
```

### Step 3: Update Storage Module

Edit `apps/api/src/common/storage/storage.module.ts`:

```typescript
import { S3StorageService } from './s3-storage.service';

// In the providers array:
{
  provide: 'STORAGE_SERVICE',
  useFactory: (configService: ConfigService): IStorageService => {
    const storageProvider = configService.get<string>('STORAGE_PROVIDER', 'local');

    switch (storageProvider) {
      case 'local':
        return new LocalStorageService(configService);
      
      case 's3':  // Add this case
        return new S3StorageService(configService);
      
      default:
        return new LocalStorageService(configService);
    }
  },
  inject: [ConfigService],
}
```

### Step 4: Install Dependencies

For AWS S3:
```bash
cd apps/api
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

For Supabase:
```bash
npm install @supabase/supabase-js
```

### Step 5: Update Environment Variables

```env
STORAGE_PROVIDER=s3

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

### Step 6: Restart Application

```bash
npm run dev
```

That's it! Your application will now use the new storage provider. **No other code changes needed.**

## Migrating Existing Files

If you have existing files in local storage and want to migrate them to cloud storage:

### Option 1: One-Time Migration Script

Create `apps/api/src/scripts/migrate-storage.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { LocalStorageService } from '../common/storage/local-storage.service';
import { S3StorageService } from '../common/storage/s3-storage.service';
import * as fs from 'fs/promises';

async function migrateFiles() {
  const prisma = new PrismaClient();
  const localStorage = new LocalStorageService(/* config */);
  const s3Storage = new S3StorageService(/* config */);

  const documents = await prisma.document.findMany();

  for (const doc of documents) {
    try {
      // Read file from local storage
      const fileBuffer = await fs.readFile(doc.filePath);
      
      // Extract tenant/entity info from path or document
      const [tenantId, entityType, entityId] = doc.filePath.split('/');
      
      // Upload to S3
      const newPath = await s3Storage.uploadFile(
        fileBuffer,
        doc.fileName,
        doc.fileType,
        tenantId,
        entityType,
        entityId,
      );

      // Update database record
      await prisma.document.update({
        where: { id: doc.id },
        data: { filePath: newPath },
      });

      console.log(`Migrated: ${doc.fileName}`);
    } catch (error) {
      console.error(`Failed to migrate ${doc.fileName}:`, error);
    }
  }

  await prisma.$disconnect();
}

migrateFiles();
```

### Option 2: Gradual Migration

Keep both storage providers active and migrate files on-demand when accessed.

## Testing the Migration

1. **Test Upload**: Upload a new file and verify it's stored in the new location
2. **Test Download**: Download the file and verify it works
3. **Test Delete**: Delete a file and verify it's removed from storage
4. **Check Database**: Verify file paths are stored correctly

## Rollback Plan

If you need to rollback:

1. Change `STORAGE_PROVIDER=local` in environment
2. Restart application
3. Files will be stored locally again

**Note:** Files already uploaded to cloud storage will remain there. You may want to keep both providers active during transition.

## Best Practices

1. **Start with Local Storage** - Develop and test locally
2. **Switch to Cloud for Production** - Use S3 or Supabase in production
3. **Use Environment Variables** - Different providers for dev/staging/prod
4. **Monitor Storage Usage** - Track costs and usage
5. **Implement Lifecycle Policies** - Auto-archive old files (S3 lifecycle rules)
6. **Backup Strategy** - Ensure files are backed up
7. **CDN Integration** - Use CloudFront with S3 for better performance

## Environment-Specific Configuration

```env
# Development
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads

# Staging
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=civic-platform-staging

# Production
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=civic-platform-prod
```

## Troubleshooting

### Files Not Uploading
- Check storage provider configuration
- Verify credentials/API keys
- Check file permissions (local storage)
- Review server logs

### Files Not Downloading
- Verify file paths in database
- Check storage service `getFileUrl` implementation
- Verify authentication/authorization

### Migration Issues
- Test with a single file first
- Keep backups of original files
- Monitor storage usage during migration

## Support

For questions or issues:
1. Check `docs/FILE_STORAGE_OPTIONS.md` for provider details
2. Review storage service implementation
3. Check NestJS dependency injection documentation

---

**Last Updated:** December 2024

