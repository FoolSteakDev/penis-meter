export interface UserWorkDto {
  schedule: number[];
  lastWeekend: Date | null;
}

export interface UserDto {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  value: number;
  lastMeasurementAt: Date | null;
  chats: number[];
  work: UserWorkDto;
  createdAt: Date;
  updatedAt: Date;
}
