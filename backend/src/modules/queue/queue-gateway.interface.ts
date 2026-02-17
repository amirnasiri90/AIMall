export const QUEUE_GATEWAY = 'QUEUE_GATEWAY';

export interface IQueueGateway {
  addJob(jobId: string, userId: string, type: string, payload: Record<string, any>): Promise<void>;
}
