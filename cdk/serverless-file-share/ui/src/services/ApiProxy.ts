import { Auth } from 'aws-amplify';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import config from '../config';

export class ApiProxy implements IApiProxy {
  private axiosInstance: AxiosInstance;
  private accessToken?: string;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.ApiUrl,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async setAccessToken(): Promise<void> {
    const session = await Auth.currentSession();
    this.accessToken = session.getAccessToken().getJwtToken();
    this.axiosInstance.defaults.headers.common.Authorization = `Bearer ${this.accessToken}`;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    await this.setAccessToken();
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    await this.setAccessToken();
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    await this.setAccessToken();
    const response = await this.axiosInstance.delete<T>(url, { data, ...config });
    return response.data;
  }

  public async uploadFileToS3(file: File, presignedUrl: string): Promise<void> {
    const config: AxiosRequestConfig<File> = {
      headers: {
        'Content-Type': file.type,
      },
    };

    await axios.put(presignedUrl, file, config);
  }
}

export default ApiProxy;
