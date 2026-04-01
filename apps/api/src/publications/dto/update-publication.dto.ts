import { IsString, IsOptional, ValidateNested, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateStatsDto {
  @IsOptional() @IsInt() @Min(0) peopleMet?: number;
  @IsOptional() @IsInt() @Min(0) peoplePreached?: number;
  @IsOptional() @IsInt() @Min(0) peoplePrayedFor?: number;
  @IsOptional() @IsInt() @Min(0) booksDistributedTotal?: number;
  @IsOptional() @IsInt() @Min(0) tractsDistributedTotal?: number;
  @IsOptional() @IsInt() @Min(0) housesVisited?: number;
  @IsOptional() @IsInt() @Min(0) neighborhoodsCovered?: number;
  @IsOptional() @IsInt() @Min(0) teamSize?: number;
}

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  narrativeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateStatsDto)
  stats?: UpdateStatsDto;
}
