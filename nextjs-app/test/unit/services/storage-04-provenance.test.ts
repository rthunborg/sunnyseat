import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { storage04ExpectedProvenance, verifyStorage04RetainedProvenance, verifyStorageProvenance } from '@/test/fixtures/epic-15/storage-04-provenance';

describe('storage-04 retained provenance', () => {
  it('pins the original measured corpus independently of the supplied directory', () => {
    // Actual retained-byte verification belongs to the explicit integration lane;
    // the default unit suite must also run in clones without local 104 MB evidence.
    expect(storage04ExpectedProvenance.daysNdjsonSha256).toBe('62aebb3fbcb9113b7aa13c64e8c835989dd13bbe53998e4fdebe5abed48b08fc');
    expect(Object.keys(storage04ExpectedProvenance.artifacts)).toEqual(expect.arrayContaining(['environment.json', 'storage-result.json', 'measurements-progress.json']));
    expect(Object.isFrozen(storage04ExpectedProvenance)).toBe(true);
    expect(Object.isFrozen(storage04ExpectedProvenance.artifacts)).toBe(true);
  });

  it('rejects a changed corpus before it can be used for revalidation', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sunnyseat-storage-provenance-'));
    try {
      await writeFile(path.join(root, 'days.ndjson'), '{"changed":true}\n');
      await expect(verifyStorage04RetainedProvenance(root)).rejects.toThrow('days.ndjson');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects missing and mismatched measurement provenance artifacts', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sunnyseat-storage-provenance-'));
    try {
      const content = Object.fromEntries([
        ['days.ndjson', 'day-bytes'],
        ['environment.json', 'environment-bytes'],
        ['storage-result.json', 'measurement-bytes'],
      ]);
      const expected = {
        daysNdjsonSha256: createHash('sha256').update(content['days.ndjson']).digest('hex'),
        artifacts: Object.fromEntries(Object.entries(content).filter(([name]) => name !== 'days.ndjson').map(([name, value]) => [name, createHash('sha256').update(value).digest('hex')])),
      };
      await writeFile(path.join(root, 'days.ndjson'), content['days.ndjson']);
      await writeFile(path.join(root, 'environment.json'), content['environment.json']);
      await expect(verifyStorageProvenance(root, expected)).rejects.toThrow('storage-result.json');

      await writeFile(path.join(root, 'storage-result.json'), 'substituted');
      await expect(verifyStorageProvenance(root, expected)).rejects.toThrow('storage-result.json');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
