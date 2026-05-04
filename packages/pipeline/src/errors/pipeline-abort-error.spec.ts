import { PipelineAbortError } from './pipeline-abort-error';

describe('PipelineAbortError', () => {
  it('should include the phase and cause', () => {
    const cause = new Error('disk full');
    const error = new PipelineAbortError('write', cause);

    expect(error.phase).toBe('write');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('Pipeline aborted during write: disk full');
    expect(error.name).toBe('PipelineAbortError');
  });

  it('should handle non-Error causes', () => {
    const error = new PipelineAbortError('source', 'timeout');

    expect(error.phase).toBe('source');
    expect(error.cause).toBe('timeout');
    expect(error.message).toBe('Pipeline aborted during source');
  });

  it('should extend Error', () => {
    const error = new PipelineAbortError('parse', new Error('bad xml'));

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PipelineAbortError);
  });
});
