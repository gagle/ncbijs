import { createHttpSource } from './http-source';

describe('createHttpSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch and yield text chunks', async () => {
    const mockBody = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(new TextEncoder().encode('hello world'));
        controller.close();
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(mockBody, { status: 200 })));

    const source = createHttpSource('https://example.com/data.txt');
    let content = '';

    for await (const chunk of source.open(new AbortController().signal)) {
      content += chunk;
    }

    expect(content).toBe('hello world');
  });

  it('should throw on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' })),
    );

    const source = createHttpSource('https://example.com/missing.txt');

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of source.open(new AbortController().signal)) {
        // consume
      }
    }).rejects.toThrow('HTTP 404');
  });

  it('should pass custom headers', async () => {
    const mockBody = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(new TextEncoder().encode('ok'));
        controller.close();
      },
    });

    const fetchSpy = vi.fn().mockResolvedValue(new Response(mockBody, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const source = createHttpSource('https://example.com/api', {
      headers: { Authorization: 'Bearer token123' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _chunk of source.open(new AbortController().signal)) {
      // consume
    }

    const callInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(callInit.headers).toEqual({ Authorization: 'Bearer token123' });
  });

  it('should respect abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));

    const source = createHttpSource('https://example.com/data.txt');

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of source.open(controller.signal)) {
        // consume
      }
    }).rejects.toThrow();
  });
});
