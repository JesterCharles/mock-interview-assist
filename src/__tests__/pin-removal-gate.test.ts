import { execSync } from 'child_process';
import { describe, it, expect } from 'vitest';

describe('PIN removal grep-gate (CLEANUP-01)', () => {
  it('src/ contains zero references to PIN auth patterns', () => {
    // grep exits 1 when no matches — that is the passing case
    // grep exits 0 when matches found — we capture stdout as the failure message
    try {
      const output = execSync(
        'grep -rn "ENABLE_ASSOCIATE_AUTH\\|pinHash\\|pinGeneratedAt\\|associate_session\\|verifyAssociateToken\\|isAssociateAuthEnabled" src/ --include="*.ts" --include="*.tsx" | grep -v "src/generated/" | grep -v "pin-removal-gate.test.ts"',
        { encoding: 'utf-8' }
      );
      // If we reach here, matches were found — fail
      expect.fail(`PIN auth patterns still present in src/:\n${output}`);
    } catch (e: unknown) {
      // grep exit code 1 = no matches = success
      const err = e as { status?: number };
      expect(err.status).toBe(1);
    }
  });
});
