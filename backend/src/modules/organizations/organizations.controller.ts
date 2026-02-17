import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgPlanGuard } from '../../common/guards/org-plan.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('invitations/my')
  @UseGuards(JwtAuthGuard)
  listMyInvitations(@CurrentUser() user: any) {
    return this.organizationsService.listMyPendingInvitations(user.id);
  }

  @Post('invitations/:invitationId/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: any) {
    return this.organizationsService.acceptInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/reject')
  @UseGuards(JwtAuthGuard)
  rejectInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: any) {
    return this.organizationsService.rejectInvitation(invitationId, user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  create(@CurrentUser() user: any, @Body('name') name: string) {
    return this.organizationsService.create(user.id, name);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: any) {
    return this.organizationsService.findAllForUser(user.id);
  }

  @Get('context')
  @UseGuards(JwtAuthGuard)
  getProfileContext(
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() user: any,
  ) {
    const id = organizationId === '' || organizationId === 'null' ? null : organizationId ?? null;
    return this.organizationsService.getProfileContext(id ?? null, user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationsService.findOne(id, user.id);
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  listOrgInvitations(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationsService.listOrgInvitations(id, user.id);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  getMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationsService.getMembers(id, user.id);
  }

  @Post(':id/members/invite')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  inviteMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('email') email: string,
    @Body('role') role: string,
  ) {
    return this.organizationsService.inviteMember(id, user.id, email, role || 'MEMBER');
  }

  @Patch(':id/members/:memberId/limits')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  updateMemberLimits(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
    @Body() body: { limitChats?: number | null; limitImageGen?: number | null; limitTextGen?: number | null; canUseAgents?: boolean },
  ) {
    return this.organizationsService.updateMemberLimits(id, user.id, memberId, body);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
    @Body('role') role: string,
  ) {
    return this.organizationsService.updateMemberRole(id, user.id, memberId, role);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.removeMember(id, user.id, memberId);
  }

  @Post(':id/transfer-ownership')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  transferOwnership(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('newOwnerMemberId') newOwnerMemberId: string,
  ) {
    return this.organizationsService.transferOwnership(id, user.id, newOwnerMemberId);
  }

  @Delete(':id/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  cancelInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.cancelInvitation(id, user.id, invitationId);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationsService.leave(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrgPlanGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { memberLimit?: number | null },
  ) {
    return this.organizationsService.update(id, user.id, body);
  }

  @Get(':id/members/:memberId/usage-counts')
  @UseGuards(JwtAuthGuard)
  getMemberUsageCounts(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.getMemberUsageCountsForMember(id, user.id, memberId);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard)
  getMemberUsage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.organizationsService.getMemberUsageStats(id, user.id, { from: fromDate, to: toDate });
  }
}
