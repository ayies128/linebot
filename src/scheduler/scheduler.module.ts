import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { LineModule } from '../line/line.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [LineModule, TaskModule],
  providers: [SchedulerService],
})
export class SchedulerModule { }
