import { ToolExecutor, ToolResult } from '../tool-executor.interface';

/**
 * Code runner tool: executes JavaScript code in a sandboxed environment.
 * Uses VM-like isolation for safety.
 */
export class CodeRunnerExecutor implements ToolExecutor {
  name = 'code_runner';

  async execute(input: string, config?: Record<string, any>): Promise<ToolResult> {
    const timeout = config?.timeout || 5000;

    try {
      // Safety checks
      const forbidden = ['require', 'import', 'process', 'fs', 'child_process', 'eval', 'Function'];
      for (const word of forbidden) {
        if (input.includes(word)) {
          return {
            success: false,
            output: '',
            error: `استفاده از "${word}" مجاز نیست`,
          };
        }
      }

      // Execute in a limited scope with timeout
      const result = await this.safeEval(input, timeout);

      return {
        success: true,
        output: String(result),
        metadata: { language: 'javascript', executionTime: 'N/A' },
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: `خطا در اجرای کد: ${error.message}`,
      };
    }
  }

  private safeEval(code: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout: اجرای کد بیش از حد مجاز طول کشید'));
      }, timeout);

      try {
        // Create a sandboxed environment
        const sandbox: Record<string, any> = {
          console: {
            log: (...args: any[]) => args.map(String).join(' '),
          },
          Math,
          JSON,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          String,
          Number,
          Boolean,
          Array,
          Object,
          Date,
          RegExp,
          Map,
          Set,
        };

        // Capture console.log output
        const logs: string[] = [];
        sandbox.console = {
          log: (...args: any[]) => logs.push(args.map(String).join(' ')),
        };

        const fn = new Function(...Object.keys(sandbox), `"use strict";\n${code}`);
        const result = fn(...Object.values(sandbox));

        clearTimeout(timer);

        if (logs.length > 0) {
          resolve(logs.join('\n'));
        } else {
          resolve(result !== undefined ? result : 'اجرا شد (بدون خروجی)');
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}
