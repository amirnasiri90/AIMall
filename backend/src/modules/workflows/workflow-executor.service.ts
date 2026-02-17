import { Injectable, Logger } from '@nestjs/common';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { ToolsService } from '../tools/tools.service';

export interface WorkflowStep {
  id: string;
  type: 'llm' | 'tool';
  config: Record<string, any>;
}

export interface WorkflowDefinition {
  steps: WorkflowStep[];
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private providerManager: ProviderManagerService,
    private toolsService: ToolsService,
  ) {}

  private interpolate(template: string, context: Record<string, string>): string {
    let out = template;
    for (const [key, value] of Object.entries(context)) {
      out = out.replace(new RegExp(`\\\$\\{${key}\\}`, 'g'), value);
      out = out.replace(new RegExp(`\\\$\\{step${key}\\}`, 'gi'), value);
    }
    return out;
  }

  async run(
    userId: string,
    definition: WorkflowDefinition,
    input: Record<string, any>,
  ): Promise<{ output: Record<string, any>; steps: Record<string, any> }> {
    const stepsOut: Record<string, any> = {};
    const context: Record<string, string> = { input: JSON.stringify(input) };

    for (const step of definition.steps || []) {
      const config = { ...step.config };
      for (const k of Object.keys(config)) {
        if (typeof config[k] === 'string') {
          config[k] = this.interpolate(config[k], context);
        }
      }

      let result: string;
      if (step.type === 'llm') {
        const res = await this.providerManager.generateTextWithFallback(
          config.prompt || '',
          config.model,
          { maxTokens: config.maxTokens || 500 },
        );
        result = res.text || '';
      } else if (step.type === 'tool') {
        const toolRes = await this.toolsService.executeTool(
          config.tool || 'calculator',
          config.input || '',
        );
        result = toolRes.success ? toolRes.output : (toolRes.error || '');
      } else {
        result = '';
      }

      stepsOut[step.id] = result;
      context[step.id] = result;
      context['step' + step.id] = result;
    }

    const lastStep = definition.steps[definition.steps.length - 1];
    const output = lastStep ? stepsOut[lastStep.id] : stepsOut;
    return { output: { result: output, steps: stepsOut }, steps: stepsOut };
  }
}
