import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@recruitflow/types';
import { changePasswordSchema, updateProfileSchema } from '@recruitflow/validation';
import type { Request } from 'express';
import type { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile and organization memberships' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated user profile' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema))
    body: z.infer<typeof updateProfileSchema>,
  ) {
    return this.usersService.updateMyProfile(user.id, body);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change authenticated user password' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: z.infer<typeof changePasswordSchema>,
  ) {
    return this.usersService.changePassword(user.id, body);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'List active sessions for the authenticated user' })
  async getSessions(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const session = (req as unknown as { session?: { id: string } }).session;
    return this.usersService.listActiveSessions(user.id, session?.id);
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate the authenticated user account' })
  async deactivate(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deactivateMyAccount(user.id);
  }
}
