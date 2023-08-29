import moment from 'moment';

import ApiProxy from './ApiProxy';
import S3 from './S3';

export class ApiService {
  private static instance: ApiService;
  private cache: ApiCache = {};
  private api: IApiProxy;
  private s3: IS3Service;

  private constructor(apiProxy: IApiProxy, s3: S3) {
    this.api = apiProxy;
    this.s3 = s3;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService(new ApiProxy(), new S3());
    }

    return ApiService.instance;
  }

  public async getOwnedFiles(ignoreCache = false): Promise<OwnedFile[]> {
    if (this.cache.ownedFiles && !ignoreCache) {
      return this.cache.ownedFiles;
    }

    const files = await this.api.get<OwnedFile[]>('/owned-files');

    this.cache.ownedFiles = files;
    return files;
  }

  public async getOwnedFile(fileId: string): Promise<OwnedFile | undefined> {
    const files = this.cache.ownedFiles
      ? this.cache.ownedFiles
      : await this.getOwnedFiles();
    return files.find((f) => f.fileId === fileId);
  }

  public async shareFile(submission: ShareFileFormSubmission): Promise<void> {
    let fileId: string;

    if (submission.source === 'upload') {
      const file = submission.uploadedFiles[0];

      // Step 1: get S3 pre-signed upload url from API
      const { uploadUrl, fileId: generatedFileId } = await this.api.get<UploadResponse>(
        `/upload/${file.name}`
      );

      // Step 2: upload file to S3
      await this.s3.uploadFileToS3(file, uploadUrl);

      fileId = generatedFileId;
    } else {
      fileId = submission.existingFile.fileId;
    }

    // Step 3: post to api
    const request: ShareApiRequest = {
      recipients: submission.recipients,
    };
    if (submission.expiryEnabled) {
      request.expiryDate = moment.utc(submission.expiryDate).toISOString();
    }
    if (submission.limitEnabled && submission.limitAmount) {
      request.downloadLimit = submission.limitAmount.value;
    }

    await this.api.post(`/share/${fileId}`, request);

    // clear cache
    delete this.cache.ownedFiles;
  }

  public async removeFiles(files: OwnedFile[]): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      await this.api.delete(`/owned-files/${files[i].fileId}`);
    }

    if (this.cache.ownedFiles) {
      // remove files from cache
      this.cache.ownedFiles = this.cache.ownedFiles?.filter((file) => {
        return !files.find((f) => f.fileId === file.fileId);
      });
    }
  }

  public async addRecipients(file: OwnedFile, recipients: Recipient[]): Promise<void> {
    await this.api.post(`/share/${file.fileId}`, { recipients });

    if (this.cache.ownedFiles) {
      const cachedFile = this.cache.ownedFiles.find((f) => f.fileId === file.fileId);

      if (cachedFile) {
        // add recipients to cache
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          cachedFile.recipients.push(recipient);
        }
      }
    }
  }

  public async removeRecipients(file: OwnedFile, recipients: Recipient[]): Promise<void> {
    await this.api.delete(`/owned-files/${file.fileId}/recipients`, {
      recipients,
    });

    if (this.cache.ownedFiles) {
      const cachedFile = this.cache.ownedFiles.find((f) => f.fileId === file.fileId);

      if (cachedFile) {
        // remove recipients from cache
        cachedFile.recipients = cachedFile.recipients.filter((recipient) => {
          return !recipients.find((r) => r.recipientEmail === recipient.recipientEmail);
        });
      }
    }
  }

  public async getDownloadUrl(fileId: string): Promise<string> {
    const { downloadUrl } = await this.api.get<{ downloadUrl: string }>(
      `/download/${fileId}`
    );

    return downloadUrl;
  }

  public async getSharedFiles(ignoreCache = false): Promise<SharedFile[]> {
    if (this.cache.sharedFiles && !ignoreCache) {
      return this.cache.sharedFiles;
    }

    const files = await this.api.get<SharedFile[]>('/shared-files');

    this.cache.sharedFiles = files;
    return files;
  }

  public clearCache(): void {
    delete this.cache.ownedFiles;
    delete this.cache.sharedFiles;
  }
}
