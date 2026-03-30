import { IsString, IsInt, Min, IsOptional, MaxLength } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
