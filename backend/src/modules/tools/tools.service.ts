import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolExecutor, ToolResult } from './tool-executor.interface';
import { CalculatorExecutor } from './executors/calculator.executor';
import { WebSearchExecutor } from './executors/web-search.executor';
import { CodeRunnerExecutor } from './executors/code-runner.executor';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);
  private executors = new Map<string, ToolExecutor>();

  constructor(private prisma: PrismaService) {
    // Register built-in executors
    this.registerExecutor(new CalculatorExecutor());
    this.registerExecutor(new WebSearchExecutor());
    this.registerExecutor(new CodeRunnerExecutor());
  }

  /**
   * Register a tool executor.
   */
  registerExecutor(executor: ToolExecutor) {
    this.executors.set(executor.name, executor);
    this.logger.log(`Tool registered: ${executor.name}`);
  }

  /**
   * Get all tool definitions from DB.
   */
  async getTools(enabledOnly = false) {
    const where = enabledOnly ? { isEnabled: true } : {};
    const tools = await this.prisma.toolDefinition.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    return tools.map((t) => ({
      ...t,
      config: t.config ? JSON.parse(t.config) : null,
      schema: t.schema ? JSON.parse(t.schema) : null,
      hasExecutor: this.executors.has(t.name),
    }));
  }

  /**
   * Get a single tool definition.
   */
  async getTool(name: string) {
    const tool = await this.prisma.toolDefinition.findUnique({ where: { name } });
    if (!tool) throw new NotFoundException(`ابزار "${name}" یافت نشد`);
    return {
      ...tool,
      config: tool.config ? JSON.parse(tool.config) : null,
      schema: tool.schema ? JSON.parse(tool.schema) : null,
      hasExecutor: this.executors.has(tool.name),
    };
  }

  /**
   * Execute a tool by name.
   */
  async executeTool(name: string, input: string): Promise<ToolResult> {
    const toolDef = await this.prisma.toolDefinition.findUnique({ where: { name } });
    if (!toolDef) {
      return { success: false, output: '', error: `ابزار "${name}" یافت نشد` };
    }

    if (!toolDef.isEnabled) {
      return { success: false, output: '', error: `ابزار "${name}" غیرفعال است` };
    }

    const executor = this.executors.get(name);
    if (!executor) {
      return { success: false, output: '', error: `اجراکننده ابزار "${name}" پیاده‌سازی نشده` };
    }

    const config = toolDef.config ? JSON.parse(toolDef.config) : {};

    this.logger.log(`Executing tool: ${name} with input: ${input.substring(0, 100)}`);
    const result = await executor.execute(input, config);
    this.logger.log(`Tool ${name} result: success=${result.success}`);

    return result;
  }

  /**
   * Update tool configuration (admin).
   */
  async updateTool(name: string, data: { isEnabled?: boolean; config?: Record<string, any> }) {
    const tool = await this.prisma.toolDefinition.findUnique({ where: { name } });
    if (!tool) throw new NotFoundException(`ابزار "${name}" یافت نشد`);

    const updateData: any = {};
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.config) updateData.config = JSON.stringify(data.config);

    return this.prisma.toolDefinition.update({
      where: { name },
      data: updateData,
    });
  }

  /**
   * Get tool categories.
   */
  async getCategories() {
    const tools = await this.prisma.toolDefinition.findMany({
      select: { category: true },
    });
    return [...new Set(tools.map((t) => t.category))];
  }
}
