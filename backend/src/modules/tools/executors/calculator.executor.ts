import { ToolExecutor, ToolResult } from '../tool-executor.interface';

/**
 * Calculator tool: evaluates mathematical expressions safely.
 */
export class CalculatorExecutor implements ToolExecutor {
  name = 'calculator';

  async execute(input: string): Promise<ToolResult> {
    try {
      // Sanitize input: only allow math characters
      const sanitized = input.replace(/[^0-9+\-*/().%^ ]/g, '');
      if (!sanitized.trim()) {
        return { success: false, output: '', error: 'عبارت ریاضی نامعتبر' };
      }

      // Replace ^ with ** for power operations
      const expression = sanitized.replace(/\^/g, '**');

      // Safe evaluation using Function constructor (no access to global scope)
      const result = new Function(`"use strict"; return (${expression})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { success: false, output: '', error: 'نتیجه نامعتبر' };
      }

      return {
        success: true,
        output: String(result),
        metadata: { expression: sanitized, result },
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: `خطا در محاسبه: ${error.message}`,
      };
    }
  }
}
