import { IsString, IsInt, Min, IsDateString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsEnum([
    'people_met',
    'people_preached',
    'people_prayed_for',
    'books_distributed_total',
    'tracts_distributed_total',
    'outings_completed',
    'events_created',
  ])
  metricType: string;

  @IsInt()
  @Min(1)
  targetValue: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(['none', 'include_existing_in_range'])
  backfillMode?: string;
}
