/**
 * The reusable workflow (.github/workflows/receipt.yml) runs the Action at
 * the release it ships in. A reusable workflow cannot read its own ref, so
 * the Action is pinned to an explicit tag; this fails when that tag and
 * package.json's version differ, so a release cannot ship a mismatch.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const root = path.join(__dirname, '..');
const pkgVersion: string = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version;
const workflowText = fs.readFileSync(path.join(root, '.github', 'workflows', 'receipt.yml'), 'utf-8');
const workflow = yaml.parse(workflowText);
const actionInputs = Object.keys(yaml.parse(fs.readFileSync(path.join(root, 'action.yml'), 'utf-8')).inputs);
const actionOutputs = Object.keys(yaml.parse(fs.readFileSync(path.join(root, 'action.yml'), 'utf-8')).outputs);

type Step = { uses?: string; with?: Record<string, string> };
const steps: Step[] = workflow.jobs.receipt.steps;
const tafSteps = steps.filter((s) => /^Wolfe-Jam\/faf-taf-git@/.test(s.uses ?? ''));

describe('reusable workflow: receipt.yml', () => {
  it('pins the Action to the package.json version', () => {
    expect(tafSteps.map((s) => s.uses)).toEqual([`Wolfe-Jam/faf-taf-git@v${pkgVersion}`]);
    // No other reference to the Action at another ref, in a comment or a step.
    const refs = workflowText.match(/Wolfe-Jam\/faf-taf-git@[^\s'"]+/g) ?? [];
    expect(refs).toEqual([`Wolfe-Jam/faf-taf-git@v${pkgVersion}`]);
  });

  it('is callable, with the documented inputs and defaults', () => {
    const inputs = workflow.on.workflow_call.inputs;
    expect(Object.keys(inputs).sort()).toEqual(['artifact-name', 'commit-message', 'runs-on', 'skipped-names', 'target-branch', 'test-output-file', 'test-result']);
    expect(inputs['artifact-name'].required).toBe(true);
    expect(inputs['test-output-file'].required).toBe(true);
    expect(inputs['target-branch'].default).toBe('taf-receipts');
    expect(inputs['skipped-names'].default).toBe('25');
    expect(inputs['runs-on'].default).toBe('ubuntu-latest');
    expect(inputs['commit-message'].default).toBe('chore(taf): update .taf receipt [skip ci]');
    expect(inputs['test-result'].required).toBe(true);
    expect(inputs['test-result'].default).toBeUndefined();
  });

  it('gives the Action only inputs it has, and passes every Action output through', () => {
    for (const name of Object.keys(tafSteps[0].with ?? {})) {expect(actionInputs).toContain(name);}
    expect(Object.keys(workflow.on.workflow_call.outputs).sort()).toEqual([...actionOutputs].sort());
    expect(Object.keys(workflow.jobs.receipt.outputs).sort()).toEqual([...actionOutputs].sort());
  });

  it('passes the test job result to the Action', () => {
    expect(tafSteps[0].with?.['test-outcome']).toBe('${{ inputs.test-result }}');
  });

  it('no test output: a warning after a failed test job, a failure after one that passed', () => {
    const download = steps.find((s: any) => s.id === 'download') as any;
    expect(download.uses).toMatch(/^actions\/download-artifact@/);
    expect(download['continue-on-error']).toBe(true);
    expect((tafSteps[0] as any).if).toBe("steps.download.outcome == 'success'");
    const none = steps.find((s: any) => s.if === "steps.download.outcome != 'success'") as any;
    // The input reaches the script through env, never interpolated into it.
    expect(none.env.TEST_RESULT).toBe('${{ inputs.test-result }}');
    expect(none.run).not.toContain('${{');
    expect(none.run).toMatch(/if \[ "\$TEST_RESULT" = "success" \]; then[\s\S]*::error::[\s\S]*exit 1[\s\S]*fi[\s\S]*::warning::.*cancelled\(\)/);
  });

  it('write access is on the receipt job only', () => {
    expect(Object.keys(workflow.jobs)).toEqual(['receipt']);
    expect(workflow.jobs.receipt.permissions).toEqual({ contents: 'write' });
  });
});
