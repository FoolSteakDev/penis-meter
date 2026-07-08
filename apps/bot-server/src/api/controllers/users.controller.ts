import { Body, Controller, Get, Patch, Path, Query, Route, Tags } from 'tsoa';
import { ApiError } from '../apiError';
import { UserModel } from '../../database/models/user.model';
import type { UserDto } from '../../dto/user.dto';
import { mapUserDocumentToDto } from '../../mappers/user.mapper';

export interface UsersListResponse {
  items: UserDto[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateUserWorkRequest {
  schedule?: number[];
  lastWeekend?: string;
}

export interface UpdateUserRequest {
  value?: number;
  username?: string | null;
  firstName?: string;
  work?: UpdateUserWorkRequest;
}

@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  @Get()
  public async listUsers(
    @Query() page = 1,
    @Query() limit = 20,
    @Query() sortDir: 'asc' | 'desc' = 'desc',
  ): Promise<UsersListResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [docs, total] = await Promise.all([
      UserModel.find()
        .sort({ value: sortDir === 'asc' ? 1 : -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      UserModel.countDocuments(),
    ]);

    return {
      items: docs.map(mapUserDocumentToDto),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  @Patch('{id}')
  public async updateUser(@Path() id: string, @Body() body: UpdateUserRequest): Promise<UserDto> {
    const update: Record<string, unknown> = {};
    if (body.value !== undefined) {
      update.value = body.value;
    }
    if (body.username !== undefined) {
      update.username = body.username;
    }
    if (body.firstName !== undefined) {
      update.first_name = body.firstName;
    }
    if (body.work?.schedule !== undefined) {
      const schedule = body.work.schedule;
      if (schedule.length !== 2 || schedule.some((n) => !Number.isFinite(n) || n <= 0)) {
        throw new ApiError(400, 'work.schedule must be exactly two positive numbers [workDays, restDays]');
      }
      update['work.schedule'] = schedule;
    }
    if (body.work?.lastWeekend !== undefined) {
      const parsed = new Date(body.work.lastWeekend);
      if (Number.isNaN(parsed.getTime())) {
        throw new ApiError(400, 'work.lastWeekend must be a valid date');
      }
      update['work.last_weekend'] = parsed;
    }

    const updated = await UserModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      throw new ApiError(404, 'User not found');
    }

    return mapUserDocumentToDto(updated);
  }
}
