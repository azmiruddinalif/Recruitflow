import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { AIProviderType } from '@recruitflow/types';

/**
 * Providers throw plain Error objects with the HTTP status embedded in the
 * message (e.g. "OpenAI API error (401): ..."). The global exception filter
 * masks plain Errors as a generic 500, so this maps them to a classified
 * HttpException with a safe, specific message the client can act on.
 */
export function classifyProviderError(error: unknown, provider: AIProviderType): HttpException {
  if (error instanceof HttpException) return error;

  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);

  if (name === 'AbortError' || /aborted/i.test(message)) {
    return new GatewayTimeoutException(
      `The request to ${provider} timed out. Try again, or check the provider's status.`,
    );
  }

  const statusMatch = message.match(/\((\d{3})\)/);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  if (status === 401 || status === 403) {
    return new UnauthorizedException(
      `${provider} rejected the configured API key. Check the key in Settings → AI Providers.`,
    );
  }

  if (status === 429) {
    return new HttpException(
      `${provider} rate limited this request. Wait a moment and try again.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  return new BadGatewayException(`The ${provider} AI request failed. Please try again shortly.`);
}
