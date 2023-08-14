import axios, { AxiosRequestConfig } from 'axios';

export class S3 implements IS3Service {
  public async uploadFileToS3(file: File, presignedUrl: string): Promise<void> {
    const config: AxiosRequestConfig<File> = {
      headers: {
        'Content-Type': file.type,
      },
    };

    await axios.put(presignedUrl, file, config);
  }
}

export default S3;
