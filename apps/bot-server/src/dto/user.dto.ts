export interface UserDto {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  value: number;
  lastMeasurementAt: Date | null;
  chats: number[];
  createdAt: Date;
  updatedAt: Date;
}
