import { IsOptional, IsString, IsInt, Min, IsBoolean, IsDateString } from 'class-validator';

export class FeedQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() authorId?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsBoolean() includeExpired?: boolean;
}
