import { PartialType } from '@nestjs/swagger';
import { UpdateRecordDto } from './update-record.dto';

export class PatchRecordDto extends PartialType(UpdateRecordDto) {}
