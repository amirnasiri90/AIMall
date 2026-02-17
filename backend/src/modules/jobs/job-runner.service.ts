import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ImageService } from '../image/image.service';
import { AudioService } from '../audio/audio.service';
import { WorkflowsService } from '../workflows/workflows.service';

export interface JobPayload {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, any>;
}

/**
 * Shared job execution logic used by both DB polling (JobProcessorService) and Bull queue (JobsQueueProcessor).
 */
@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);

  constructor(
    private jobsService: JobsService,
    private imageService: ImageService,
    private audioService: AudioService,
    @Inject(forwardRef(() => WorkflowsService))
    private workflowsService: WorkflowsService,
  ) {}

  async run(job: JobPayload): Promise<void> {
    const { id, userId, type, payload } = job;

    switch (type) {
      case 'image': {
        const { prompt, style, size, model } = payload;
        const out = await this.imageService.generate(userId, prompt || '', style, size, model);
        await this.jobsService.complete(id, out);
        break;
      }
      case 'audio_tts': {
        const { text, voice, model } = payload;
        const out = await this.audioService.textToSpeech(userId, text || '', voice, model);
        await this.jobsService.complete(id, out);
        break;
      }
      case 'audio_stt': {
        const { fileBase64, mimetype, originalname, size } = payload;
        if (!fileBase64) {
          await this.jobsService.complete(id, {}, 'فایل صوتی در payload یافت نشد');
          return;
        }
        const buffer = Buffer.from(fileBase64, 'base64');
        const out = await this.audioService.speechToText(
          userId,
          originalname,
          size,
          undefined,
          buffer,
          mimetype,
        );
        await this.jobsService.complete(id, out);
        break;
      }
      case 'workflow': {
        const { workflowId, input } = payload;
        if (!workflowId) {
          await this.workflowsService.completeRunByJobId(id, {}, 'workflowId الزامی است');
          await this.jobsService.complete(id, {}, 'workflowId الزامی است');
          return;
        }
        try {
          const { output, steps } = await this.workflowsService.executeWorkflowOnly(workflowId, userId, input || {});
          await this.workflowsService.completeRunByJobId(id, { output, steps });
          await this.jobsService.complete(id, { output, steps });
        } catch (err: any) {
          await this.workflowsService.completeRunByJobId(id, {}, err.message);
          await this.jobsService.complete(id, {}, err.message);
        }
        break;
      }
      default:
        await this.jobsService.complete(id, {}, `نوع کار نامعتبر: ${type}`);
    }
  }
}
