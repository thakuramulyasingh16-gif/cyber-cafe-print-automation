import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface PrintOptions {
  filePath: string;
  printerName: string;
  copies: number;
  colorMode: 'BW' | 'COLOR';
  paperSize: string;
  duplex: boolean;
  jobId: string;
  orderNumber: string;
}

export interface PrintAdapter {
  name: string;
  print(options: PrintOptions): Promise<void>;
}

// ===================================================================
// MOCK ADAPTER - For testing without a real printer
// IMPORTANT: This adapter does NOT actually print anything.
// It simulates success/failure for testing purposes.
// ===================================================================
export class MockPrintAdapter implements PrintAdapter {
  name = 'MOCK (Test Mode)';

  async print(options: PrintOptions): Promise<void> {
    console.log(`\n[MOCK ADAPTER] Simulating print job:`);
    console.log(`  File: ${options.filePath}`);
    console.log(`  Printer: ${options.printerName || '(mock printer)'}`);
    console.log(`  Copies: ${options.copies}`);
    console.log(`  Mode: ${options.colorMode}`);
    console.log(`  Paper: ${options.paperSize}`);
    console.log(`  Duplex: ${options.duplex}`);
    console.log(`  Order: ${options.orderNumber}`);
    
    // Simulate print time (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;
    await sleep(delay);
    
    // In mock mode, always succeed
    // To test failure, uncomment this:
    // throw new Error('Mock printer error: Paper jam');
    
    console.log(`[MOCK ADAPTER] ✅ Print simulation complete (${delay.toFixed(0)}ms)`);
    console.log(`[MOCK ADAPTER] ⚠️  NOTE: No real document was printed!`);
  }
}

// ===================================================================
// WINDOWS PRINT ADAPTER - For real Windows printing
// Requires: Windows with PowerShell
// ===================================================================
export class WindowsPrintAdapter implements PrintAdapter {
  name = 'Windows';

  async print(options: PrintOptions): Promise<void> {
    const ext = path.extname(options.filePath).toLowerCase();
    
    if (ext === '.pdf') {
      await this.printPDF(options);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      await this.printImage(options);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async printPDF(options: PrintOptions): Promise<void> {
    // Use PowerShell to print PDF via SumatraPDF or default PDF handler
    // Method 1: Try SumatraPDF (most reliable for automated printing)
    const sumatraPath = [
      'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
      'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    ];
    
    for (const sumatraExe of sumatraPath) {
      try {
        const printerArg = options.printerName ? `-print-to "${options.printerName}"` : '-print-to-default';
        const settingsArgs = [
          `paper=${options.paperSize}`,
          options.colorMode === 'BW' ? 'color=greyscale' : 'color=color',
          options.duplex ? 'duplex=DuplexFlipLongEdge' : 'duplex=None',
        ].join(',');
        
        const printSettings = `-print-settings "${settingsArgs},${options.copies}x"`;
        const cmd = `"${sumatraExe}" ${printerArg} ${printSettings} "${options.filePath}"`;
        
        console.log(`🖨️ Running SumatraPDF: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
        if (stdout) console.log('SumatraPDF stdout:', stdout);
        if (stderr && !stderr.includes('Settings saved')) {
          console.warn('SumatraPDF stderr:', stderr);
        }
        return;
      } catch {
        // SumatraPDF not found, try next
        continue;
      }
    }
    
    // Method 2: PowerShell with Start-Process -Verb Print
    await this.printWithPowerShell(options);
  }

  private async printImage(options: PrintOptions): Promise<void> {
    await this.printWithPowerShell(options);
  }

  private async printWithPowerShell(options: PrintOptions): Promise<void> {
    const copies = options.copies;
    const printerArg = options.printerName 
      ? `-PrinterName "${options.printerName}"` 
      : '';
    
    // PowerShell command to print
    const psCommand = `
      $file = '${options.filePath.replace(/'/g, "''")}'
      $copies = ${copies}
      ${options.printerName ? `$printer = '${options.printerName.replace(/'/g, "''")}'` : ''}
      
      # Try to print using the default program
      for ($i = 0; $i -lt $copies; $i++) {
        Start-Process -FilePath $file -Verb Print -Wait -ErrorAction Stop
      }
    `;
    
    const escapedCmd = psCommand.replace(/"/g, '\\"');
    const fullCmd = `powershell.exe -NonInteractive -Command "${psCommand}"`;
    
    console.log('🖨️ Printing via PowerShell...');
    const { stdout, stderr } = await execAsync(
      `powershell.exe -NonInteractive -ExecutionPolicy Bypass -Command ${JSON.stringify(psCommand)}`,
      { timeout: 120000 }
    );
    
    if (stdout) console.log('PowerShell output:', stdout);
    if (stderr) console.warn('PowerShell warning:', stderr);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createPrintAdapter(): PrintAdapter {
  const adapterType = (process.env.PRINT_ADAPTER || 'MOCK').toUpperCase();
  
  switch (adapterType) {
    case 'WINDOWS':
      console.log('🖨️ Using Windows Print Adapter (real printing)');
      return new WindowsPrintAdapter();
    case 'MOCK':
    default:
      console.log('🧪 Using Mock Print Adapter (testing mode - no real printing)');
      console.log('   Set PRINT_ADAPTER=WINDOWS in .env for real printing');
      return new MockPrintAdapter();
  }
}
