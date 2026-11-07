import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IStorageProvider,
  StoredFileResult,
  UploadFileParams,
  validateUploadConstraints,
} from './storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly driverName = 'local' as const;
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(
      process.cwd(),
      process.env.STORAGE_LOCAL_DIR ?? './storage/uploads',
    );
  }

  private sanitizeSegment(input: string): string {
    return input.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private resolveSafePath(fileKey: string): string {
    const normalizedKey = fileKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const resolved = path.resolve(this.baseDir, normalizedKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new NotFoundException('Invalid storage key path');
    }
    return resolved;
  }

  async uploadFile(params: UploadFileParams): Promise<StoredFileResult> {
    validateUploadConstraints(params);

    const safeOrgId = this.sanitizeSegment(params.organizationId);
    const safeFolder = this.sanitizeSegment(params.folder ?? 'resumes');
    const ext = path.extname(params.originalName) || '.pdf';
    const safeExt = this.sanitizeSegment(ext);
    const uniqueFileName = `${randomUUID()}${safeExt}`;
    const fileKey = `${safeOrgId}/${safeFolder}/${uniqueFileName}`;

    const fullPath = this.resolveSafePath(fileKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, params.buffer);

    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    return {
      fileKey,
      fileName: params.originalName,
      fileUrl: `${apiUrl}/api/v1/storage/files/${fileKey}`,
      mimeType: params.mimeType,
      fileSizeBytes: params.buffer.byteLength,
    };
  }

  async readFile(fileKey: string): Promise<Buffer> {
    const fullPath = this.resolveSafePath(fileKey);
    try {
      return await fs.readFile(fullPath);
    } catch {
      throw new NotFoundException(`Stored file not found: ${fileKey}`);
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    const fullPath = this.resolveSafePath(fileKey);
    try {
      await fs.unlink(fullPath);
    } catch {
      // Ignore if already removed
    }
  }

  async getSignedUrl(fileKey: string, _expiresInSeconds = 3600): Promise<string> {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    return `${apiUrl}/api/v1/storage/files/${fileKey}`;
  }
}
