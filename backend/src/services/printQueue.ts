import { emitNewPrintJob } from '../socket';

// Simple in-memory queue (Redis/Bull can replace this when available)
const printQueue: string[] = [];
let isProcessing = false;

export async function queuePrintJob(jobId: string): Promise<void> {
  printQueue.push(jobId);
  console.log(`📋 Print job queued: ${jobId}`);
  
  // Notify print agents via Socket.IO
  emitNewPrintJob({ id: jobId, status: 'QUEUED' } as Record<string, unknown>);
}

export function getNextPrintJob(): string | undefined {
  return printQueue.shift();
}

export function getPrintQueueLength(): number {
  return printQueue.length;
}
