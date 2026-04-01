import { Module } from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { PublicationsController } from './publications.controller';
import { CommentsController } from './comments.controller';
import { InteractionsController } from './interactions.controller';

@Module({
  controllers: [PublicationsController, CommentsController, InteractionsController],
  providers: [PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
