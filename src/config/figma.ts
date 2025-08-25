export const figmaConfig = {
  accessToken: process.env.FIGMA_ACCESS_TOKEN,
  fileId: process.env.FIGMA_FILE_ID,
  baseUrl: 'https://api.figma.com/v1',
  endpoints: {
    file: '/files',
    images: '/images',
    comments: '/files/{file_id}/comments'
  }
};

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

export interface FigmaResponse {
  document: FigmaNode;
  components: Record<string, unknown>;
  schemaVersion: number;
}