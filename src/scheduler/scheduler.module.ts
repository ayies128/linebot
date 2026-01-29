import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { LineModule } from '../line/line.module';

@Module({
  imports: [LineModule],
  providers: [SchedulerService],
})
export class SchedulerModule { }
