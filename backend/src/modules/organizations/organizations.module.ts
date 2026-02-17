import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrgContractService } from './org-contract.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgContractService],
  exports: [OrganizationsService, OrgContractService],
})
export class OrganizationsModule {}
