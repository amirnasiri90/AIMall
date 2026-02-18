import { IsString, IsOptional, IsIn } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateTicketDto {
  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(['IN_PROGRESS', 'SUPPORT_REPLIED', 'CUSTOMER_REPLIED', 'CLOSED'])
  status?: string;

  @Expose()
  @IsOptional()
  assignedToId?: string | null;
}
