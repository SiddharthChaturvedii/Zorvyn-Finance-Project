import { ParseUUIDPipe as NestParseUUIDPipe } from '@nestjs/common';

export const ParseUUIDPipe = new NestParseUUIDPipe({ version: '4' });
