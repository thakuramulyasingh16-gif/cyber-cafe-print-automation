import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PrintAdapter, createPrintAdapter } from './adapters';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'print-agent-dev-token-change-in-production';
const TEMP_DIR = process.env.TEMP_DIR || './temp';

interface PrintJob {
  id: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  order: {
    id: string;
    orderNumber: string;
    colorMode: string;
    paperSize: string;
    copies: number;
    duplex: boolean;
    pageRangeStart: number | null;
    pageRangeEnd: number | null;
    document: {
      id: string;
      originalName: string;
      mimeType: string;
    };
  };
  printer: {
    name: string;
    displayName: string;
  } | null;
}

const backendApi = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'x-agent-token': AGENT_TOKEN,
  },
});

const processingJobs = new Set<string>();

export class PrintAgent {
  private adapter: PrintAdapter;

  constructor() {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    this.adapter = createPrintAdapter();
    console.log(`✅ Print adapter initialized: ${this.adapter.name}`);
  }

  async processPendingJobs(): Promise<void> {
    try {
      const { data } = await backendApi.get('/print/jobs');
      const jobs: PrintJob[] = data.jobs || [];

      if (jobs.length > 0) {
        console.log(`📋 Found ${jobs.length} pending job(s)`);
      }

      for (const job of jobs) {
        if (!processingJobs.has(job.id)) {
          this.processJob(job).catch(err => {
            console.error(`❌ Error processing job ${job.id}:`, err.message);
          });
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED') {
          // Backend not available, silently fail
          return;
        }
        if (err.response?.status === 401) {
          console.error('❌ Invalid agent token - cannot fetch jobs');
          return;
        }
      }
      console.error('❌ Failed to fetch jobs:', (err as Error).message);
    }
  }

  private async processJob(job: PrintJob): Promise<void> {
    if (processingJobs.has(job.id)) {
      console.log(`⏭️ Job ${job.id} already being processed, skipping`);
      return;
    }

    processingJobs.add(job.id);
    console.log(`\n🖨️ Processing job: ${job.id}`);
    console.log(`   Order: ${job.order.orderNumber}`);
    console.log(`   File: ${job.order.document.originalName}`);
    console.log(`   Copies: ${job.order.copies}, Mode: ${job.order.colorMode}, Size: ${job.order.paperSize}`);

    let tempFilePath: string | null = null;

    try {
      // Mark as PRINTING
      await this.updateJobStatus(job.id, 'PRINTING');

      // Download document
      console.log(`📥 Downloading document...`);
      tempFilePath = await this.downloadDocument(job.order.document.id, job.order.document.originalName);
      console.log(`✅ Downloaded to: ${tempFilePath}`);

      // Determine printer
      const printerName = process.env.PRINTER_NAME || job.printer?.name || '';

      // Print document
      console.log(`🖨️ Sending to printer...`);
      await this.adapter.print({
        filePath: tempFilePath,
        printerName,
        copies: job.order.copies,
        colorMode: job.order.colorMode as 'BW' | 'COLOR',
        paperSize: job.order.paperSize,
        duplex: job.order.duplex,
        jobId: job.id,
        orderNumber: job.order.orderNumber,
      });

      // Mark as COMPLETED
      await this.updateJobStatus(job.id, 'COMPLETED');
      console.log(`✅ Job ${job.id} completed successfully!`);

    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`❌ Job ${job.id} failed:`, errorMsg);
      await this.updateJobStatus(job.id, 'FAILED', errorMsg);
    } finally {
      // Cleanup temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`🗑️ Cleaned up temp file`);
        } catch {
          // Ignore cleanup errors
        }
      }
      processingJobs.delete(job.id);
    }
  }

  private async downloadDocument(documentId: string, originalName: string): Promise<string> {
    const ext = path.extname(originalName) || '.pdf';
    const tempPath = path.join(TEMP_DIR, `${documentId}_${Date.now()}${ext}`);

    const response = await backendApi.get(`/print/document/${documentId}`, {
      responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve(tempPath));
      writer.on('error', reject);
    });
  }

  private async updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
    try {
      await backendApi.patch(`/print/jobs/${jobId}/status`, { status, error });
    } catch (err) {
      console.error(`⚠️ Failed to update job status to ${status}:`, (err as Error).message);
    }
  }
}
