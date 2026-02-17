import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { SupportService } from '../support/support.service';
import { ServiceMappingPayload } from '../ai-providers/service-mapping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private supportService: SupportService,
  ) {}

  // ── Users ──

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.adminService.getUsers({
      search,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      role,
      sortBy: sortBy || 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; role?: string; coins?: number; password?: string },
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateUser(id, body, admin.id);
  }

  @Patch('users/:id/coins')
  adjustUserCoins(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
    @CurrentUser() admin: any,
  ) {
    return this.adminService.adjustUserCoins(id, body.amount, body.reason, admin.id);
  }

  // ── Pricing & Model Costs ──

  @Get('pricing/coin-price')
  getCoinPrice() {
    return this.adminService.getCoinPriceIRR();
  }

  @Patch('pricing/coin-price')
  setCoinPrice(@Body('coinPriceIRR') value: number, @CurrentUser() admin: any) {
    return this.adminService.setCoinPriceIRR(Number(value), admin.id);
  }

  @Get('pricing/model-costs')
  getAllModelCosts() {
    return this.adminService.getAllModelCosts();
  }

  @Patch('pricing/model-costs/:service')
  setModelCosts(
    @Param('service') service: 'text' | 'image' | 'tts' | 'stt',
    @Body() body: Record<string, number>,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.setModelCosts(service, body, admin.id);
  }

  // ── Coin Packages (Admin) ──

  @Get('packages')
  getPackagesAdmin() {
    return this.adminService.getPackagesAdmin();
  }

  @Post('packages')
  createPackage(@Body() body: CreatePackageDto) {
    return this.adminService.createPackage(body);
  }

  @Patch('packages/:id/package-type')
  setPackageType(
    @Param('id') id: string,
    @Body('packageType') packageTypeFromBody?: string,
    @Query('packageType') packageTypeFromQuery?: string,
  ) {
    const raw = (packageTypeFromBody ?? packageTypeFromQuery ?? 'PERSONAL').toString();
    const value = raw === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSONAL';
    return this.adminService.setPackageType(id, value);
  }

  @Patch('packages/:id')
  updatePackage(
    @Param('id') id: string,
    @Body() body: UpdatePackageDto,
    @Req() req: Request,
    @Query('packageType') packageTypeQuery?: string,
  ) {
    const rawBody = req.body as Record<string, unknown>;
    const payload = { ...body } as Record<string, unknown>;
    const fromQuery = packageTypeQuery !== undefined && packageTypeQuery !== null;
    const fromBody = rawBody?.packageType !== undefined && rawBody?.packageType !== null;
    const rawValue = fromQuery ? packageTypeQuery : (fromBody ? String(rawBody.packageType) : null);
    if (rawValue !== null) {
      payload.packageType = rawValue === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSONAL';
    }
    return this.adminService.updatePackage(id, payload as UpdatePackageDto);
  }

  @Post('packages/:id/delete')
  deletePackage(@Param('id') id: string) {
    return this.adminService.deletePackage(id);
  }

  // ── Discount Codes ──

  @Get('discount-codes')
  getDiscountCodes(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getDiscountCodes(Number(page) || 1, Number(limit) || 20);
  }

  @Post('discount-codes')
  createDiscountCode(
    @Body()
    body: {
      code: string;
      type?: 'PERCENT' | 'FIXED';
      value: number;
      minOrderIRR?: number;
      maxUses?: number;
      validFrom?: string;
      validTo?: string;
      isActive?: boolean;
    },
  ) {
    return this.adminService.createDiscountCode(body);
  }

  @Patch('discount-codes/:id')
  updateDiscountCode(
    @Param('id') id: string,
    @Body()
    body: {
      code?: string;
      type?: string;
      value?: number;
      minOrderIRR?: number | null;
      maxUses?: number | null;
      validFrom?: string | null;
      validTo?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.adminService.updateDiscountCode(id, body);
  }

  @Post('discount-codes/:id/delete')
  deleteDiscountCode(@Param('id') id: string) {
    return this.adminService.deleteDiscountCode(id);
  }

  // ── Stats ──

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/daily')
  getDailyStats(@Query('days') days?: string) {
    return this.adminService.getDailyStats(Number(days) || 30);
  }

  @Get('stats/services')
  getServiceStats() {
    return this.adminService.getServiceStats();
  }

  @Get('stats/revenue')
  getRevenueStats(@Query('days') days?: string) {
    return this.adminService.getRevenueStats(Number(days) || 30);
  }

  // ── Support Tickets ──

  @Get('tickets')
  getTickets(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supportService.findAllForAdmin({
      status,
      category,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.supportService.findOneForAdmin(id);
  }

  @Patch('tickets/:id')
  async updateTicket(
    @Param('id') id: string,
    @Body() body: UpdateTicketDto,
  ) {
    if (body.status !== undefined) await this.supportService.updateStatus(id, body.status);
    if (body.assignedToId !== undefined) await this.supportService.assign(id, body.assignedToId);
    return this.supportService.findOneForAdmin(id);
  }

  @Post('tickets/:id/messages')
  replyToTicket(
    @Param('id') id: string,
    @CurrentUser() admin: any,
    @Body('content') content: string,
  ) {
    if (!content?.trim()) throw new BadRequestException('متن پیام الزامی است');
    return this.supportService.addMessage(id, admin.id, content.trim(), true);
  }

  // ── System Settings ──

  @Get('settings')
  getSettings(@Query('category') category?: string) {
    return this.adminService.getSettings(category);
  }

  @Patch('settings/:key')
  updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateSetting(key, value, admin.id);
  }

  // ── Audit Logs ──

  @Get('audit-logs')
  getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs({
      userId,
      action,
      entity,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    });
  }

  @Get('audit-logs/export')
  async exportAuditLogs(
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const limitNum = limit ? Number(limit) : 10000;
    if (format === 'json') {
      const data = await this.adminService.exportAuditLogsJson(fromDate, toDate, limitNum);
      res!.setHeader('Content-Type', 'application/json; charset=utf-8');
      res!.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
      return res!.json(data);
    }
    const csv = await this.adminService.exportAuditLogsCsv(fromDate, toDate, limitNum);
    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    return res!.send(csv);
  }

  @Get('audit-logs/retention')
  getAuditRetention() {
    return this.adminService.getAuditRetentionDays().then((days) => ({ retentionDays: days }));
  }

  @Post('audit-logs/purge')
  purgeAuditLogs(
    @Body('olderThanDays') olderThanDays?: number,
    @CurrentUser() admin?: any,
  ) {
    return this.adminService.purgeAuditLogs(olderThanDays);
  }

  // ── Organizations (قراردادها) ──

  @Get('organizations')
  getOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrganizations(
      Number(page) || 1,
      Number(limit) || 20,
      search,
    );
  }

  @Patch('organizations/:id/contract')
  updateOrgContract(
    @Param('id') id: string,
    @Body() body: { contractEndsAt?: string | null; customCoinQuota?: number | null; plan?: string },
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateOrganizationContract(id, body, admin.id);
  }

  // ── Provider Health ──

  @Get('providers/health')
  getProvidersHealth() {
    return this.adminService.getProvidersHealth();
  }

  @Patch('providers/:providerId/toggle')
  toggleProvider(@Param('providerId') providerId: string, @Body('enabled') enabled: boolean) {
    return this.adminService.toggleProvider(providerId, enabled);
  }

  // ── AI Providers (config, API key, test) ──

  @Get('ai-providers')
  listAiProviders() {
    return this.adminService.listAiProviders();
  }

  @Get('ai-providers/:id')
  getAiProvider(@Param('id') id: string) {
    return this.adminService.getAiProvider(id);
  }

  @Patch('ai-providers/:id')
  updateAiProvider(
    @Param('id') id: string,
    @Body() body: { displayName?: string; apiKey?: string; config?: object; isEnabled?: boolean },
  ) {
    return this.adminService.updateAiProvider(id, body);
  }

  @Post('ai-providers/:id/test')
  testAiProvider(@Param('id') id: string, @Body('apiKey') apiKey?: string) {
    return this.adminService.testAiProvider(id, apiKey);
  }

  @Get('service-mapping')
  getServiceMapping() {
    return this.adminService.getServiceMapping();
  }

  @Patch('service-mapping')
  setServiceMapping(@Body() body: ServiceMappingPayload) {
    return this.adminService.setServiceMapping(body);
  }

  // ── Reconciliation ──

  @Post('reconcile-all')
  reconcileAll() {
    return this.adminService.reconcileAll();
  }

  // ── Export ──

  @Get('export/users')
  async exportUsers(@Res() res: Response) {
    const csv = await this.adminService.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  }

  @Get('export/transactions')
  async exportTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.adminService.exportTransactionsCsv(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res!.send('\uFEFF' + csv);
  }
}
