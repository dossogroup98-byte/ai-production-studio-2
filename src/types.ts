export type StudioTab = 'video' | 'avatar' | 'image' | 'huggingface-i2v' | 'multi-reference' | 'multi-image-composition' | 'multi-reference-start-end' | 'text-to-image-frames' | 'image-to-image-frames' | 'diagnostics' | 'monorepo' | 'gallery';

export interface GenerationItem {
  id: string;
  type: 'video' | 'avatar' | 'image';
  title: string;
  prompt: string;
  provider: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  url?: string;
  sourceImageUrl?: string;
  aspectRatio: string;
  duration?: number;
  error?: string;
  createdAt: number;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  passed: boolean;
  details: string;
  remedy: string;
}

export interface DiagnosticReport {
  timestamp: number;
  summary: string;
  all_passed: boolean;
  tests: DiagnosticTest[];
  recommendations: string[];
}

export interface StudioSettings {
  agnesKey: string;
  agnesBaseUrl: string;
  hedraKey: string;
  hedraBaseUrl: string;
  cfAccountId: string;
  cfToken: string;
  geminiKey: string;
  customBackendUrl: string;
}




