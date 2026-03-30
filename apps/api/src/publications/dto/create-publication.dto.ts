import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsArray,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class StatsDto {
  @IsOptional() @IsInt() @Min(0) peopleMet?: number;
  @IsOptional() @IsInt() @Min(0) peoplePreached?: number;
  @IsOptional() @IsInt() @Min(0) peoplePrayedFor?: number;
  @IsOptional() @IsInt() @Min(0) booksDistributedTotal?: number;
  @IsOptional() @IsInt() @Min(0) tractsDistributedTotal?: number;
  @IsOptional() @IsInt() @Min(0) housesVisited?: number;
  @IsOptional() @IsInt() @Min(0) neighborhoodsCovered?: number;
  @IsOptional() @IsInt() @Min(0) teamSize?: number;
}

class MaterialItemDto {
  @IsString() @MaxLength(200) title: string;
  @IsInt() @Min(1) quantity: number;
}

class MaterialsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialItemDto)
  books?: MaterialItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialItemDto)
  tracts?: MaterialItemDto[];
}

export class CreatePublicationDto {
  @IsEnum(['past_outreach', 'future_event', 'testimony', 'prayer_request'])
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsString()
  @MaxLength(5000)
  narrativeText: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationName?: string;

  @IsOptional()
  @IsDateString()
  outreachDate?: string;

  @IsOptional()
  @IsDateString()
  eventStartAt?: string;

  @IsOptional()
  @IsDateString()
  eventEndAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StatsDto)
  stats?: StatsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialsDto)
  materials?: MaterialsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}
