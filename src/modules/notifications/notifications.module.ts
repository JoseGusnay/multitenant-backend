import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp/whatsapp.service';

@Module({
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class NotificationsModule {}
