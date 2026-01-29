import { Module } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TaskModule],
  controllers: [LineController],
  providers: [LineService],
  exports: [LineService],
})
export class LineModule { }
