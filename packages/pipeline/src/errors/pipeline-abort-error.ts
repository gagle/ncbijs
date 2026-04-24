/** Error thrown when a pipeline run is aborted via signal or error strategy. */
export class PipelineAbortError extends Error {
  public readonly phase: 'source' | 'parse' | 'write';
  public override readonly cause: unknown;

  constructor(phase: 'source' | 'parse' | 'write', cause: unknown) {
    const message =
      cause instanceof Error
        ? `Pipeline aborted during ${phase}: ${cause.message}`
        : `Pipeline aborted during ${phase}`;
    super(message);
    this.name = 'PipelineAbortError';
    this.phase = phase;
    this.cause = cause;
  }
}
