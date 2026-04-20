import { describe, expect, it } from 'vitest';
import { parsePollResponse, parseSubmitResponse } from './parse-qblast-info';

describe('parseSubmitResponse', () => {
  it('should extract RID and RTOE from a standard response', () => {
    const responseText = [
      '<!DOCTYPE html>',
      '<html>',
      '<!--QBlastInfoBegin',
      '    RID = ABCDEF123',
      '    RTOE = 19',
      'QBlastInfoEnd-->',
      '</html>',
    ].join('\n');

    const submitResult = parseSubmitResponse(responseText);

    expect(submitResult.rid).toBe('ABCDEF123');
    expect(submitResult.estimatedSeconds).toBe(19);
  });

  it('should handle response with extra whitespace around values', () => {
    const responseText = '    RID =   XYZ789   \n    RTOE =   42   ';

    const submitResult = parseSubmitResponse(responseText);

    expect(submitResult.rid).toBe('XYZ789');
    expect(submitResult.estimatedSeconds).toBe(42);
  });

  it('should default estimatedSeconds to 0 when RTOE is missing', () => {
    const responseText = '    RID = NOTIME123';

    const submitResult = parseSubmitResponse(responseText);

    expect(submitResult.rid).toBe('NOTIME123');
    expect(submitResult.estimatedSeconds).toBe(0);
  });

  it('should throw when RID is missing', () => {
    const responseText = '    RTOE = 19';

    expect(() => parseSubmitResponse(responseText)).toThrow('BLAST submit response missing RID');
  });

  it('should throw on empty response', () => {
    expect(() => parseSubmitResponse('')).toThrow('BLAST submit response missing RID');
  });
});

describe('parsePollResponse', () => {
  it('should parse WAITING status', () => {
    const responseText = '    Status=WAITING';

    const pollResult = parsePollResponse(responseText);

    expect(pollResult.status).toBe('waiting');
  });

  it('should parse READY status', () => {
    const responseText = '    Status=READY';

    const pollResult = parsePollResponse(responseText);

    expect(pollResult.status).toBe('ready');
  });

  it('should parse FAILED status', () => {
    const responseText = '    Status=FAILED';

    const pollResult = parsePollResponse(responseText);

    expect(pollResult.status).toBe('failed');
  });

  it('should parse UNKNOWN status', () => {
    const responseText = '    Status=UNKNOWN';

    const pollResult = parsePollResponse(responseText);

    expect(pollResult.status).toBe('unknown');
  });

  it('should handle status with spaces around equals sign', () => {
    const responseText = '    Status = READY';

    const pollResult = parsePollResponse(responseText);

    expect(pollResult.status).toBe('ready');
  });

  it('should throw when Status is missing', () => {
    const responseText = '    ThereIsNoStatus = HERE';

    expect(() => parsePollResponse(responseText)).toThrow('BLAST poll response missing Status');
  });

  it('should throw on empty response', () => {
    expect(() => parsePollResponse('')).toThrow('BLAST poll response missing Status');
  });

  it('should throw on unexpected status value', () => {
    const responseText = '    Status=BOGUS';

    expect(() => parsePollResponse(responseText)).toThrow(
      'BLAST poll response has unexpected status: BOGUS',
    );
  });
});
