import apiClient from './client';
import type { ApiResponse } from '@/types';

export interface ExecuteDataValidationError {
  row: number;
  field: string;
  message: string;
}

export interface OutputFileInfo {
  factory: string;
  rows: number;
  filename: string;
  download_url: string;
}

export interface ExecuteDataResponse {
  status: 'success';
  processed_rows: number;
  date_range: { from: string; to: string };
  warnings: string[];
  output_files: OutputFileInfo[];
  total_output_rows: number;
}

export const executeDataApi = {
  processFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<ExecuteDataResponse>>(
      '/execute-data/process',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      }
    );
  },
};
