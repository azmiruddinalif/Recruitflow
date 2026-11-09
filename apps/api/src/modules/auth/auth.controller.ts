import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@recruitflow/types';
import { loginSchema, registerSchema } from '@recruitflow/validation';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookie(res: Response, token: string, expiresAt: Date): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('better-auth.session_token', token, {
      httpOnly: true,
      path: '/',
      // The web app and API are deployed on different registrable domains in
      // production (Vercel + Render), making every request cross-site. A
      // SameSite=Lax cookie is never attached to cross-site fetch/XHR calls,
      // so the browser silently drops it on every authenticated request
      // after login, resulting in 401s everywhere. SameSite=None (which
      // requires Secure) is the correct setting for this topology; Lax is
      // kept for local dev where web and API share the "localhost" site.
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      expires: expiresAt,
    });
  }

  private clearSessionCookie(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const options = { path: '/', sameSite: isProduction ? 'none' : 'lax', secure: isProduction } as const;
    res.clearCookie('better-auth.session_token', options);
    res.clearCookie('rf_session_token', options);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and optional initial organization workspace' })
  async register(
    @Body(new ZodValidationPipe(registerSchema))
    body: z.infer<typeof registerSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setSessionCookie(res, result.token, result.session.expiresAt);
    return result;
  }

  @Public()
  @Post('sign-up/email')
  @ApiOperation({ summary: 'Better Auth compatible email sign-up endpoint' })
  async signUpEmail(
    @Body(new ZodValidationPipe(registerSchema))
    body: z.infer<typeof registerSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.register(body, req, res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email & password and create session' })
  async login(
    @Body(new ZodValidationPipe(loginSchema))
    body: z.infer<typeof loginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setSessionCookie(res, result.token, result.session.expiresAt);
    return result;
  }

  @Public()
  @Post('sign-in/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Better Auth compatible email sign-in endpoint' })
  async signInEmail(
    @Body(new ZodValidationPipe(loginSchema))
    body: z.infer<typeof loginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.login(body, req, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current session and clear session cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(
      req.headers as Record<string, string | string[] | undefined>,
    );
    this.clearSessionCookie(res);
    return result;
  }

  @Public()
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Better Auth compatible sign-out endpoint' })
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.logout(req, res);
  }

  @Get('session')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user, session, and organization context' })
  async getSession(@Req() req: Request) {
    return this.authService.getSession(
      req.headers as Record<string, string | string[] | undefined>,
    );
  }

  @Get('get-session')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Better Auth compatible get-session endpoint' })
  async getBetterAuthSession(@Req() req: Request) {
    return this.getSession(req);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset token' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    body: z.infer<typeof forgotPasswordSchema>,
  ) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using verification token' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema))
    body: z.infer<typeof resetPasswordSchema>,
  ) {
    return this.authService.resetPassword(body);
  }

  @Post('revoke-sessions')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all active sessions for the current user' })
  async revokeSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.revokeAllUserSessions(user.id);
  }
}
