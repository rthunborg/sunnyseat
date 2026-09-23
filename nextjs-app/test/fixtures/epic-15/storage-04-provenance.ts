import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Immutable identity of the original full 42-venue storage measurement.
 *
 * These values are deliberately literals rather than values derived from the
 * supplied directory.  A revalidation therefore cannot bless a substituted
 * corpus merely by recomputing an expected digest from that same corpus.
 */
export const storage04ExpectedProvenance = Object.freeze({
  daysNdjsonSha256: '62aebb3fbcb9113b7aa13c64e8c835989dd13bbe53998e4fdebe5abed48b08fc',
  artifacts: Object.freeze({
    'environment.json': '2b3a2dd1592e98d428a082066ca15d9eb2c779815b2cbb8268af2ea862b5002f',
    'storage-result.json': '7d08ade7878d46c8f147574e7022751fc86ab9bd25803d0f506ce85d73833703',
    'measurements-progress.json': '26fa7849003e07eecda582a4315bbb9e8f1c62538cc69922290a7b274a43ca6a',
    'derived-budget-comparison.json': '9db1cc33aa5e2f676132ff708780e0849c1ffdef845afba53343bef8c3f35ea8',
    'census-v0.json': '21e4370a241cffbf4e7b4be13a9ac167e9da35b4bcca58c34c3e182076c5cc8d',
    'census-v1.json': '6b00af77cbeec0949e3c4b765921ddbdceb59df192ea30d42dd0ef41c041f2cc',
    'census-v2.json': '1e92088bcda3c23cf8f823591c233cf8545d5ebd0177293b005e811022fdeddc',
  }),
});

export type RetainedStorage04Provenance = {
  readonly root: string;
  readonly environment: {
    readonly database: string;
    readonly cohortVenueIds: string[];
    readonly sources: Record<string, string>;
  };
  readonly measurement: {
    readonly measurements: Array<{
      readonly generation: string;
      readonly dates: number;
      readonly samples: number;
      readonly year: number;
    }>;
    readonly networkAttempts: number;
  };
};

export type StorageProvenanceExpectation = {
  readonly daysNdjsonSha256: string;
  readonly artifacts: Readonly<Record<string, string>>;
};

export async function sha256File(file: string): Promise<string> {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}

/** Validates original bytes before any caller is allowed to mutate its audit DB. */
export async function verifyStorageProvenance(root: string, expectedProvenance: StorageProvenanceExpectation): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const expected = new Map<string, string>([
    ['days.ndjson', expectedProvenance.daysNdjsonSha256],
    ...Object.entries(expectedProvenance.artifacts),
  ]);

  for (const [relativePath, expectedSha256] of expected) {
    const file = path.join(resolvedRoot, relativePath);
    if (!existsSync(file)) throw Error(`Missing pinned retained storage-04 evidence: ${relativePath}`);
    const actualSha256 = await sha256File(file);
    if (actualSha256 !== expectedSha256) {
      throw Error(`Pinned retained storage-04 evidence digest mismatch for ${relativePath}`);
    }
  }
}

export async function verifyStorage04RetainedProvenance(root: string): Promise<RetainedStorage04Provenance> {
  const resolvedRoot = path.resolve(root);
  await verifyStorageProvenance(resolvedRoot, storage04ExpectedProvenance);

  const environment = JSON.parse(readFileSync(path.join(resolvedRoot, 'environment.json'), 'utf8')) as RetainedStorage04Provenance['environment'];
  const measurement = JSON.parse(readFileSync(path.join(resolvedRoot, 'storage-result.json'), 'utf8')) as RetainedStorage04Provenance['measurement'];
  if (!/^e152_storage_[0-9a-f]{32}$/.test(environment.database) || environment.cohortVenueIds.length !== 42) {
    throw Error('Pinned retained storage-04 environment is not the declared full isolated cohort');
  }
  if (!Array.isArray(measurement.measurements) || measurement.networkAttempts !== 0) {
    throw Error('Pinned retained storage-04 measurement provenance is incomplete');
  }

  return { root: resolvedRoot, environment, measurement };
}
