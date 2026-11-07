import { BadRequestException } from '@nestjs/common';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
] as const;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  ...ALLOWED_RESUME_MIME_TYPES,
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export interface UploadFileParams {
  organizationId: string;
  folder?: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  maxSizeBytes?: number;
  allowedMimeTypes?: readonly string[];
}

export interface StoredFileResult {
  fileKey: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface IStorageProvider {
  readonly driverName: 'local' | 's3';
  uploadFile(params: UploadFileParams): Promise<StoredFileResult>;
  readFile(fileKey: string): Promise<Buffer>;
  deleteFile(fileKey: string): Promise<void>;
  getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
}

export function validateUploadConstraints(params: UploadFileParams): void {
  const maxBytes =
    params.maxSizeBytes ?? Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024);

  if (!params.buffer || params.buffer.byteLength === 0) {
    throw new BadRequestException('Uploaded file cannot be empty');
  }

  if (params.buffer.byteLength > maxBytes) {
    throw new BadRequestException(
      `File exceeds maximum allowed size of ${Math.round(maxBytes / (1024 * 1024))}MB`,
    );
  }

  const allowedTypes = params.allowedMimeTypes ?? ALLOWED_ATTACHMENT_MIME_TYPES;
  if (!allowedTypes.includes(params.mimeType)) {
    throw new BadRequestException(
      `Unsupported file MIME type "${params.mimeType}". Allowed types: ${allowedTypes.join(', ')}`,
    );
  }
}
