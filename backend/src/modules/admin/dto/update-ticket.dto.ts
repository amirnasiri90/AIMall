import { IsString, IsOptional, IsIn } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateTicketDto {
  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'CLOSED'])
  status?: string;

  @Expose()
  @IsOptional()
  assignedToId?: string | null;
}
