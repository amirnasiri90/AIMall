import { Injectable } from '@nestjs/common';

export interface InvitationPayload {
  email: string;
  phone?: string | null;
  organizationName: string;
  role: string;
  acceptToken?: string | null;
}

@Injectable()
export class NotificationsService {
  /** ارسال دعوتنامه سازمانی به ایمیل (قابل جایگزینی با سرویس واقعی) */
  async sendInviteEmail(payload: InvitationPayload): Promise<void> {
    // TODO: اتصال به سرویس ایمیل (مثلاً Nodemailer، SendGrid، ...)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Notifications] sendInviteEmail', {
        to: payload.email,
        org: payload.organizationName,
        role: payload.role,
      });
    }
  }

  /** ارسال دعوتنامه سازمانی به پیامک (قابل جایگزینی با سرویس واقعی) */
  async sendInviteSms(payload: InvitationPayload): Promise<void> {
    if (!payload.phone) return;
    // TODO: اتصال به سرویس SMS (مثلاً Kavenegar، ...)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Notifications] sendInviteSms', {
        to: payload.phone,
        org: payload.organizationName,
      });
    }
  }
}
