export class AutomatosError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AutomatosError';
  }
}

export class AuthError extends AutomatosError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class NetworkError extends AutomatosError {
  public status?: number;
  public retryAfter?: number;

  constructor(message: string, status?: number, retryAfter?: number) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    this.status = status;
    this.retryAfter = retryAfter;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export class StreamError extends AutomatosError {
  constructor(message: string) {
    super(message, 'STREAM_ERROR');
    this.name = 'StreamError';
  }
}
