import { figmaConfig, FigmaResponse } from '@/config/figma';

class FigmaAPI {
  private baseUrl: string;
  private accessToken: string;

  constructor() {
    this.baseUrl = figmaConfig.baseUrl;
    this.accessToken = figmaConfig.accessToken || '';
  }

  private async request(endpoint: string, options?: RequestInit): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Figma-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFile(fileId: string): Promise<FigmaResponse> {
    return this.request(`/files/${fileId}`) as Promise<FigmaResponse>;
  }

  async getImages(fileId: string, nodeIds: string[], format: 'jpg' | 'png' | 'svg' = 'png'): Promise<{ images: Record<string, string> }> {
    const nodeIdsParam = nodeIds.join(',');
    return this.request(`/images/${fileId}?ids=${nodeIdsParam}&format=${format}`) as Promise<{ images: Record<string, string> }>;
  }

  async exportAssets(fileId: string, nodeIds: string[]): Promise<string[]> {
    try {
      const response = await this.getImages(fileId, nodeIds, 'png');
      return Object.values(response.images) as string[];
    } catch (error) {
      console.error('Error exporting assets from Figma:', error);
      throw error;
    }
  }

  async downloadAsset(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const blob = await response.blob();
      
      if (typeof window !== 'undefined') {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error downloading asset:', error);
      throw error;
    }
  }
}

export const figmaApi = new FigmaAPI();