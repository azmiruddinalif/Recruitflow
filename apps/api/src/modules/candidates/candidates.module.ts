import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesRepository } from './candidates.repository';
import { CandidatesService } from './candidates.service';

@Module({
  controllers: [CandidatesController],
  providers: [CandidatesRepository, CandidatesService],
  exports: [CandidatesRepository, CandidatesService],
})
export class CandidatesModule {}
