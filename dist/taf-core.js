"use strict";
/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTafFile = updateTafFile;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
/**
 * Update .taf file with new test results
 */
async function updateTafFile(tafPath, testResults) {
    try {
        // Read existing .taf file
        const content = fs.readFileSync(tafPath, 'utf-8');
        const taf = parseTAF(content);
        // Create test run entry
        const run = {
            timestamp: new Date().toISOString(),
            result: testResults.result,
            tests: {
                total: testResults.total,
                passed: testResults.passed,
                failed: testResults.failed,
                skipped: testResults.skipped,
            },
            trigger: 'github-actions',
        };
        // Append to history
        taf.test_history.push(run);
        // Serialize and write back
        const updated = serializeTAF(taf);
        fs.writeFileSync(tafPath, updated, 'utf-8');
        return true;
    }
    catch (error) {
        console.error('Failed to update .taf file:', error);
        return false;
    }
}
/**
 * Parse .taf file content
 */
function parseTAF(content) {
    // Split on document separator and take only first document
    const lines = content.split('\n');
    const yamlLines = [];
    for (const line of lines) {
        // Stop at document separator (but skip initial one if present)
        if (line.trim() === '---' && yamlLines.length > 0) {
            break;
        }
        // Skip initial document separator
        if (line.trim() === '---' && yamlLines.length === 0) {
            continue;
        }
        yamlLines.push(line);
    }
    const parsed = yaml.parse(yamlLines.join('\n'));
    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid .taf file: not a valid YAML object');
    }
    if (!parsed.test_history || !Array.isArray(parsed.test_history)) {
        throw new Error('Invalid .taf file: missing or invalid test_history');
    }
    return parsed;
}
/**
 * Serialize TAF object back to YAML
 * Uses yaml library to maintain existing format
 */
function serializeTAF(taf) {
    // Update last_updated timestamp
    taf.last_updated = new Date().toISOString();
    // Use yaml.stringify to preserve format
    return yaml.stringify(taf);
}
//# sourceMappingURL=taf-core.js.map