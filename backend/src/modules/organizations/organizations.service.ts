import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  private slugify(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '')
      .toLowerCase()
      .slice(0, 50);
  }

  async create(userId: string, name: string) {
    const ownedCount = await this.prisma.orgMember.count({
      where: { userId, role: 'OWNER' },
    });
    if (ownedCount >= 1) {
      throw new BadRequestException('با پلن سازمانی تنها می‌توانید یک سازمان تعریف کنید.');
    }

    const slug = this.slugify(name) || 'org-' + Date.now();
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    const org = await this.prisma.organization.create({
      data: { name: name.trim(), slug: finalSlug },
    });
    await this.prisma.orgMember.create({
      data: { organizationId: org.id, userId, role: 'OWNER' },
    });
    this.audit.log({
      userId,
      action: 'ORGANIZATION_CREATE',
      entity: 'Organization',
      entityId: org.id,
      details: { name: org.name, slug: org.slug },
    }).catch(() => {});
    return org;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.organization, role: m.role }));
  }

  async findOne(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { organizationId: orgId, userId },
      include: { organization: true },
    });
    if (!member) throw new ForbiddenException('دسترسی به این سازمان ندارید');
    return { ...member.organization, role: member.role };
  }

  async getMembers(orgId: string, userId: string) {
    await this.ensureMember(orgId, userId);
    return this.prisma.orgMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async inviteMember(orgId: string, userId: string, inviteEmail: string, role: string) {
    const admin = await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('سازمان یافت نشد');
    if (org.memberLimit != null) {
      const count = await this.prisma.orgMember.count({ where: { organizationId: orgId } });
      if (count >= org.memberLimit) {
        throw new BadRequestException(`حداکثر تعداد اعضا (${org.memberLimit}) به‌دست آمده است.`);
      }
    }
    const targetUser = await this.prisma.user.findUnique({ where: { email: inviteEmail.trim().toLowerCase() } });
    if (!targetUser) throw new NotFoundException('کاربر با این ایمیل یافت نشد');

    const existingMember = await this.prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUser.id } },
    });
    if (existingMember) throw new BadRequestException('کاربر قبلاً عضو است');

    const pendingInvite = await this.prisma.orgInvitation.findFirst({
      where: { organizationId: orgId, userId: targetUser.id, status: 'PENDING' },
    });
    if (pendingInvite) throw new BadRequestException('دعوتنامهٔ در انتظار برای این کاربر از قبل وجود دارد');

    const allowedRoles = admin.role === 'OWNER' ? ['ADMIN', 'MEMBER'] : ['MEMBER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('نقش نامعتبر');

    const token = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const invitation = await this.prisma.orgInvitation.create({
      data: {
        organizationId: orgId,
        email: targetUser.email,
        phone: targetUser.phone ?? undefined,
        userId: targetUser.id,
        role,
        invitedByUserId: userId,
        status: 'PENDING',
        token,
      },
      include: { organization: { select: { name: true } } },
    });

    const payload = {
      email: invitation.email,
      phone: invitation.phone ?? targetUser.phone ?? undefined,
      organizationName: org.name,
      role,
      acceptToken: token,
    };
    await this.notifications.sendInviteEmail(payload).catch(() => {});
    await this.notifications.sendInviteSms(payload).catch(() => {});

    this.audit.log({
      userId,
      action: 'ORGANIZATION_INVITE',
      entity: 'OrgInvitation',
      entityId: invitation.id,
      details: { organizationId: orgId, inviteEmail: invitation.email, role, targetUserId: targetUser.id },
    }).catch(() => {});
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      organizationName: org.name,
    };
  }

  async listMyPendingInvitations(userId: string) {
    const list = await this.prisma.orgInvitation.findMany({
      where: { userId, status: 'PENDING' },
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return list;
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.orgInvitation.findUnique({
      where: { id: invitationId },
      include: { organization: true },
    });
    if (!invitation) throw new NotFoundException('دعوتنامه یافت نشد');
    if (invitation.userId !== userId) throw new ForbiddenException('این دعوتنامه برای شما نیست');
    if (invitation.status !== 'PENDING') throw new BadRequestException('این دعوتنامه دیگر معتبر نیست');

    const org = invitation.organization;
    if (org.memberLimit != null) {
      const count = await this.prisma.orgMember.count({ where: { organizationId: org.id } });
      if (count >= org.memberLimit) {
        throw new BadRequestException(`حداکثر تعداد اعضای سازمان به‌دست آمده است.`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.orgMember.create({
        data: { organizationId: invitation.organizationId, userId, role: invitation.role },
      }),
      this.prisma.orgInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED' },
      }),
    ]);
    this.audit.log({
      userId,
      action: 'ORGANIZATION_INVITATION_ACCEPT',
      entity: 'OrgInvitation',
      entityId: invitationId,
      details: { organizationId: invitation.organizationId },
    }).catch(() => {});
    return { success: true, organizationId: invitation.organizationId, organizationName: org.name };
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.orgInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException('دعوتنامه یافت نشد');
    if (invitation.userId !== userId) throw new ForbiddenException('این دعوتنامه برای شما نیست');
    if (invitation.status !== 'PENDING') throw new BadRequestException('این دعوتنامه دیگر معتبر نیست');

    await this.prisma.orgInvitation.update({
      where: { id: invitationId },
      data: { status: 'REJECTED' },
    });
    return { success: true };
  }

  async listOrgInvitations(orgId: string, userId: string) {
    await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    return this.prisma.orgInvitation.findMany({
      where: { organizationId: orgId, status: 'PENDING' },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMemberLimits(
    orgId: string,
    userId: string,
    memberId: string,
    body: { limitChats?: number | null; limitImageGen?: number | null; limitTextGen?: number | null; canUseAgents?: boolean },
  ) {
    await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('عضو یافت نشد');
    const data: Record<string, unknown> = {};
    if (body.limitChats !== undefined) data.limitChats = body.limitChats;
    if (body.limitImageGen !== undefined) data.limitImageGen = body.limitImageGen;
    if (body.limitTextGen !== undefined) data.limitTextGen = body.limitTextGen;
    if (body.canUseAgents !== undefined) data.canUseAgents = body.canUseAgents;
    return this.prisma.orgMember.update({
      where: { id: memberId },
      data,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateMemberRole(orgId: string, userId: string, memberId: string, newRole: string) {
    const allowedRoles = ['ADMIN', 'MEMBER'];
    if (!allowedRoles.includes(newRole)) {
      throw new BadRequestException('نقش نامعتبر؛ فقط ADMIN یا MEMBER مجاز است.');
    }
    await this.ensureRole(orgId, userId, ['OWNER']);
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('عضو یافت نشد');
    if (member.role === 'OWNER') throw new BadRequestException('نقش مالک قابل تغییر نیست');

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    this.audit.log({
      userId,
      action: 'ORGANIZATION_UPDATE_MEMBER_ROLE',
      entity: 'OrgMember',
      entityId: memberId,
      details: { organizationId: orgId, newRole },
    }).catch(() => {});
    return updated;
  }

  async transferOwnership(orgId: string, userId: string, newOwnerMemberId: string) {
    await this.ensureRole(orgId, userId, ['OWNER']);
    const currentOwner = await this.prisma.orgMember.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!currentOwner || currentOwner.role !== 'OWNER') throw new ForbiddenException('فقط مالک می‌تواند مالکیت را منتقل کند');
    const newOwner = await this.prisma.orgMember.findFirst({
      where: { id: newOwnerMemberId, organizationId: orgId },
    });
    if (!newOwner) throw new NotFoundException('عضو یافت نشد');
    if (newOwner.userId === userId) throw new BadRequestException('مالکیت را می‌توان فقط به عضو دیگری منتقل کرد');

    await this.prisma.$transaction([
      this.prisma.orgMember.update({
        where: { id: currentOwner.id },
        data: { role: 'ADMIN' },
      }),
      this.prisma.orgMember.update({
        where: { id: newOwnerMemberId },
        data: { role: 'OWNER' },
      }),
    ]);
    this.audit.log({
      userId,
      action: 'ORGANIZATION_TRANSFER_OWNERSHIP',
      entity: 'Organization',
      entityId: orgId,
      details: { newOwnerUserId: newOwner.userId, newOwnerMemberId },
    }).catch(() => {});
    return { success: true, message: 'مالکیت با موفقیت منتقل شد.' };
  }

  async cancelInvitation(orgId: string, userId: string, invitationId: string) {
    await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    const invitation = await this.prisma.orgInvitation.findFirst({
      where: { id: invitationId, organizationId: orgId, status: 'PENDING' },
    });
    if (!invitation) throw new NotFoundException('دعوتنامهٔ در انتظار یافت نشد');
    await this.prisma.orgInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    });
    this.audit.log({
      userId,
      action: 'ORGANIZATION_INVITATION_CANCEL',
      entity: 'OrgInvitation',
      entityId: invitationId,
      details: { organizationId: orgId, invitedEmail: invitation.email },
    }).catch(() => {});
    return { success: true };
  }

  async leave(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!member) throw new NotFoundException('عضو نیستید');
    if (member.role === 'OWNER') throw new BadRequestException('مالک نمی‌تواند سازمان را ترک کند؛ ابتدا مالکیت را منتقل کنید.');
    await this.prisma.orgMember.delete({ where: { id: member.id } });
    this.audit.log({
      userId,
      action: 'ORGANIZATION_LEAVE',
      entity: 'Organization',
      entityId: orgId,
      details: {},
    }).catch(() => {});
    return { success: true };
  }

  async removeMember(orgId: string, userId: string, memberId: string) {
    await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    const target = await this.prisma.orgMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!target) throw new NotFoundException('عضو یافت نشد');
    if (target.role === 'OWNER') throw new BadRequestException('امکان حذف مالک وجود ندارد');
    await this.prisma.orgMember.delete({ where: { id: memberId } });
    this.audit.log({
      userId,
      action: 'ORGANIZATION_REMOVE_MEMBER',
      entity: 'OrgMember',
      entityId: memberId,
      details: { organizationId: orgId, removedUserId: target.userId },
    }).catch(() => {});
    return { success: true };
  }

  private async ensureMember(orgId: string, userId: string) {
    const m = await this.prisma.orgMember.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!m) throw new ForbiddenException('دسترسی به این سازمان ندارید');
    return m;
  }

  async update(orgId: string, userId: string, body: { memberLimit?: number | null }) {
    await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    const data: { memberLimit?: number | null } = {};
    if (body.memberLimit !== undefined) {
      const v = body.memberLimit;
      if (v != null && (typeof v !== 'number' || v < 1)) {
        throw new BadRequestException('حد اعضا باید عدد مثبت یا خالی باشد');
      }
      data.memberLimit = v;
    }
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
    this.audit.log({
      userId,
      action: 'ORGANIZATION_UPDATE',
      entity: 'Organization',
      entityId: orgId,
      details: data,
    }).catch(() => {});
    return org;
  }

  async getMemberUsageStats(
    orgId: string,
    userId: string,
    options?: { from?: Date; to?: Date },
  ) {
    await this.ensureRole(orgId, userId, ['OWNER', 'ADMIN']);
    const members = await this.prisma.orgMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    const from = options?.from;
    const to = options?.to;
    const whereBase: any = { type: 'DEBIT' };
    if (from || to) {
      whereBase.createdAt = {};
      if (from) whereBase.createdAt.gte = from;
      if (to) whereBase.createdAt.lte = to;
    }
    const results = await Promise.all(
      members.map(async (m) => {
        const agg = await this.prisma.transaction.aggregate({
          where: { userId: m.userId, ...whereBase },
          _sum: { amount: true },
          _count: true,
        });
        return {
          userId: m.userId,
          email: m.user?.email,
          name: m.user?.name,
          role: m.role,
          totalCoinsUsed: agg._sum.amount ?? 0,
          transactionCount: agg._count,
        };
      }),
    );
    return { members: results };
  }

  private async ensureRole(orgId: string, userId: string, roles: string[]) {
    const m = await this.ensureMember(orgId, userId);
    if (!roles.includes(m.role)) throw new ForbiddenException('دسترسی کافی ندارید');
    return m;
  }

  /** Used by other modules: check if user in org context can create a new chat. Throws if over limit. */
  async checkOrgChatLimit(orgId: string, userId: string): Promise<void> {
    const member = await this.prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member || member.limitChats == null) return;
    const count = await this.prisma.conversation.count({
      where: { userId, organizationId: orgId },
    });
    if (count >= member.limitChats) {
      throw new BadRequestException(`محدودیت تعداد چت‌ها (${member.limitChats}) در این سازمان به‌دست آمده است.`);
    }
  }

  /** Check if user in org context can create image generation. */
  async checkOrgImageLimit(orgId: string, userId: string): Promise<void> {
    const member = await this.prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member || member.limitImageGen == null) return;
    const count = await this.prisma.generation.count({
      where: { userId, organizationId: orgId, service: 'image' },
    });
    if (count >= member.limitImageGen) {
      throw new BadRequestException(`محدودیت تعداد تولید تصویر (${member.limitImageGen}) در این سازمان به‌دست آمده است.`);
    }
  }

  /** Check if user in org context can create text generation. */
  async checkOrgTextLimit(orgId: string, userId: string): Promise<void> {
    const member = await this.prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member || member.limitTextGen == null) return;
    const count = await this.prisma.generation.count({
      where: { userId, organizationId: orgId, service: 'text' },
    });
    if (count >= member.limitTextGen) {
      throw new BadRequestException(`محدودیت تعداد تولید متن (${member.limitTextGen}) در این سازمان به‌دست آمده است.`);
    }
  }

  /** Check if user in org context can use agents. */
  async checkOrgAgentsAllowed(orgId: string, userId: string): Promise<void> {
    const member = await this.prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) return;
    if (member.canUseAgents === false) {
      throw new BadRequestException('استفاده از دستیارها در این سازمان برای شما محدود شده است.');
    }
  }

  /** Get current usage counts for a member (for admin UI). */
  async getMemberUsageCounts(orgId: string, memberUserId: string) {
    const [chatCount, imageCount, textCount] = await Promise.all([
      this.prisma.conversation.count({ where: { userId: memberUserId, organizationId: orgId } }),
      this.prisma.generation.count({ where: { userId: memberUserId, organizationId: orgId, service: 'image' } }),
      this.prisma.generation.count({ where: { userId: memberUserId, organizationId: orgId, service: 'text' } }),
    ]);
    return { chatCount, imageCount, textCount };
  }

  /** Get usage counts and limits for a member (by OrgMember id). For OWNER/ADMIN. */
  async getMemberUsageCountsForMember(orgId: string, requesterUserId: string, memberId: string) {
    await this.ensureRole(orgId, requesterUserId, ['OWNER', 'ADMIN']);
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('عضو یافت نشد');
    const usage = await this.getMemberUsageCounts(orgId, member.userId);
    return {
      ...usage,
      limitChats: member.limitChats,
      limitImageGen: member.limitImageGen,
      limitTextGen: member.limitTextGen,
      canUseAgents: member.canUseAgents,
    };
  }

  /**
   * برای نمایش در پنل وقتی کاربر با پروفایل سازمان وارد شده: محدودیت‌ها و مصرف فعلی عضو.
   * اگر organizationId نباشد یا کاربر عضو نباشد، null برمی‌گرداند.
   */
  async getProfileContext(
    organizationId: string | null,
    userId: string,
  ): Promise<{
    organizationName: string;
    limitChats: number | null;
    limitImageGen: number | null;
    limitTextGen: number | null;
    canUseAgents: boolean;
    chatCount: number;
    imageCount: number;
    textCount: number;
  } | null> {
    if (!organizationId) return null;
    const member = await this.prisma.orgMember.findFirst({
      where: { organizationId, userId },
      include: { organization: { select: { name: true } } },
    });
    if (!member) return null;
    const usage = await this.getMemberUsageCounts(organizationId, userId);
    return {
      organizationName: member.organization.name,
      limitChats: member.limitChats,
      limitImageGen: member.limitImageGen,
      limitTextGen: member.limitTextGen,
      canUseAgents: member.canUseAgents,
      chatCount: usage.chatCount,
      imageCount: usage.imageCount,
      textCount: usage.textCount,
    };
  }
}
