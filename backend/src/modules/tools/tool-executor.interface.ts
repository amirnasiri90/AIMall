/**
 * Interface for tool executors.
 * Each tool (calculator, web search, code runner, etc.) implements this interface.
 */
export interface ToolExecutor {
  /** Unique name of the tool */
  name: string;

  /** Execute the tool with given input */
  execute(input: string, config?: Record<string, any>): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  metadata?: Record<string, any>;
  error?: string;
}
