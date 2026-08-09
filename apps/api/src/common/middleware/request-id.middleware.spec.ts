import { RequestIdMiddleware } from './request-id.middleware';
import type { Request, Response } from 'express';

describe('RequestIdMiddleware', () => {
  it('generates X-Request-Id when missing', () => {
    const mw = new RequestIdMiddleware();
    const req = { header: () => undefined } as unknown as Request;
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    } as unknown as Response;
    mw.use(req, res, () => undefined);
    expect(headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/i);
    expect((req as Request & { requestId?: string }).requestId).toBe(
      headers['X-Request-Id'],
    );
  });

  it('reuses valid client request id', () => {
    const mw = new RequestIdMiddleware();
    const req = {
      header: (name: string) =>
        name === 'x-request-id' ? 'client-req-12345678' : undefined,
    } as unknown as Request;
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    } as unknown as Response;
    mw.use(req, res, () => undefined);
    expect(headers['X-Request-Id']).toBe('client-req-12345678');
  });

  it('rejects invalid request id', () => {
    const mw = new RequestIdMiddleware();
    const req = {
      header: () => 'bad id!!',
    } as unknown as Request;
    const res = { setHeader: () => undefined } as unknown as Response;
    expect(() => mw.use(req, res, () => undefined)).toThrow(/Invalid/);
  });
});
