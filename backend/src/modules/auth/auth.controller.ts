import { Controller, Post, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { OrgContractService } from '../organizations/org-contract.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';
import { LoginOtpDto } from './dto/login-otp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private orgContract: OrgContractService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register-phone')
  registerWithPhone(@Body() dto: RegisterPhoneDto) {
    return this.authService.registerWithPhone(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req?: Request) {
    const ip = req?.ip ?? req?.socket?.remoteAddress ?? undefined;
    return this.authService.login(dto, ip);
  }

  @Post('send-otp')
  sendOtp(@Body() body: { phone?: string }) {
    return this.authService.sendOtp(body);
  }

  @Post('login-otp')
  loginWithOtp(@Body() dto: LoginOtpDto, @Req() req?: Request) {
    const ip = req?.ip ?? req?.socket?.remoteAddress ?? undefined;
    return this.authService.loginWithOtp(dto, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    const billingContext = await this.orgContract.getBillingContextForUser(user.id);
    return { ...user, billingContext };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@CurrentUser() user: any, @Body() body: { name?: string; phone?: string }) {
    return this.authService.updateProfile(user.id, body);
  }
}
