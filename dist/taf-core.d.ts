/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */
import { TestResults } from './parsers/jest';
/**
 * Update .taf file with new test results
 * Creates the file if it doesn't exist
 */
export declare function updateTafFile(tafPath: string, testResults: TestResults): boolean;
//# sourceMappingURL=taf-core.d.ts.map