/// <reference types="react-scripts" />
declare module 'react-router-dom';
declare module 'react-dom/client';

type OwnedFile = {
  fileId: string;
  filename: string;
  dateAdded: string;
  size: number;
  recipients: Recipient[];
};

type SharedFile = {
  fileId: string;
  filename: string;
  size: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
};

interface BaseShareFileFormSubmission {
  source: 'upload' | 'existing';
  recipients: Recipient[];
  expiryEnabled: boolean;
  expiryDate?: string;
  limitEnabled: boolean;
  limitAmount?: { text: string; value: number };
}

interface ShareUploadFileFormSubmission extends BaseShareFileFormSubmission {
  source: 'upload';
  uploadedFiles: FileType[];
}

interface ShareExistingFileFormSubmission extends BaseShareFileFormSubmission {
  source: 'existing';
  existingFile: OwnedFile;
}

type ShareFileFormSubmission =
  | ShareUploadFileFormSubmission
  | ShareExistingFileFormSubmission;

type ShareApiRequest = {
  recipients: Recipient[];
  expiryDate?: string;
  downloadLimit?: number;
};

type Recipient = {
  recipientEmail: string;
  notify?: boolean;
  expiryDate?: string;
  downloadLimit?: number;
};

interface UploadResponse {
  uploadUrl: string;
  fileId: string;
}

interface ApiCache {
  ownedFiles?: OwnedFile[];
  sharedFiles?: SharedFile[];
}

interface IApiProxy {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
}

interface IS3Service {
  uploadFileToS3(file: File, presignedUrl: string): Promise<void>;
}
