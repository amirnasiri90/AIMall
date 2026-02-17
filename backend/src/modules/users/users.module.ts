import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
