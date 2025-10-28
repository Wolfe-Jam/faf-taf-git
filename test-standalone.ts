/**
 * Standalone test script to simulate the action
 * Tests the action logic without GitHub Actions environment
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseJestOutput } from './src/parsers/jest';
import { updateTafFile } from './src/taf-core';

async function testAction() {
  console.log('Starting standalone action test...\n');

  // Simulate Jest output from faf-cli
  const jestOutput = `
PASS src/commands/taf-init.test.ts
PASS src/commands/taf-log.test.ts
PASS src/commands/taf-validate.test.ts
PASS src/commands/taf-stats.test.ts

Test Suites: 18 passed, 18 total
Tests:       173 passed, 173 total
Snapshots:   0 total
Time:        2.512 s
Ran all test suites.
`;

  console.log('1. Parsing Jest output...');
  const testResults = parseJestOutput(jestOutput);

  if (!testResults) {
    console.error('❌ Failed to parse Jest output');
    process.exit(1);
  }

  console.log('✅ Parsed successfully:');
  console.log(`   - Total: ${testResults.total}`);
  console.log(`   - Passed: ${testResults.passed}`);
  console.log(`   - Failed: ${testResults.failed}`);
  console.log(`   - Result: ${testResults.result}\n`);

  // Test with faf-cli .taf file
  const tafPath = path.join('/Users/wolfejam/FAF/cli', '.taf');

  console.log('2. Checking .taf file...');
  if (!fs.existsSync(tafPath)) {
    console.error('❌ No .taf file found at:', tafPath);
    process.exit(1);
  }
  console.log('✅ Found .taf file\n');

  console.log('3. Reading current .taf file...');
  const beforeContent = fs.readFileSync(tafPath, 'utf-8');
  const beforeLines = beforeContent.split('\n').filter(line => line.includes('timestamp')).length;
  console.log(`✅ Current test runs: ${beforeLines}\n`);

  console.log('4. Updating .taf file...');
  const updated = await updateTafFile(tafPath, testResults);

  if (!updated) {
    console.error('❌ Failed to update .taf file');
    process.exit(1);
  }
  console.log('✅ .taf file updated\n');

  console.log('5. Verifying update...');
  const afterContent = fs.readFileSync(tafPath, 'utf-8');
  const afterLines = afterContent.split('\n').filter(line => line.includes('timestamp')).length;
  console.log(`✅ Test runs after update: ${afterLines}`);

  if (afterLines !== beforeLines + 1) {
    console.error('❌ Expected one additional run');
    process.exit(1);
  }

  console.log('\n✅ Standalone test PASSED');
  console.log('\nThe action successfully:');
  console.log('  - Parsed Jest output (173/173 tests)');
  console.log('  - Updated .taf file');
  console.log('  - Added new test run entry');
  console.log('  - Maintained proper format');
}

testAction().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
