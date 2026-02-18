"use strict";
/**
 * Badge Generator for faf-taf-git
 *
 * Generates shields.io-style SVG badges from .taf test history.
 * Self-contained SVG with Verdana font, no external dependencies.
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
exports.renderBadgeSvg = renderBadgeSvg;
exports.generateBadge = generateBadge;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
const COLOR_PASS = '#00D4D4'; // Cyan sweetspot
const COLOR_FAIL = '#E32400'; // Red
const COLOR_NONE = '#9F9F9F'; // Gray
/**
 * Render a shields.io flat-style SVG badge.
 */
function renderBadgeSvg(label, value, color) {
    // Approximate text widths using Verdana 11px (6.5px per char average)
    const charWidth = 6.5;
    const padding = 10;
    const labelWidth = Math.round(label.length * charWidth + padding * 2);
    const valueWidth = Math.round(value.length * charWidth + padding * 2);
    const totalWidth = labelWidth + valueWidth;
    const height = 20;
    const labelX = labelWidth / 2;
    const valueX = labelWidth + valueWidth / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelX}" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - padding) * 10}">${label}</text>
    <text x="${labelX}" y="130" transform="scale(.1)" textLength="${(labelWidth - padding) * 10}">${label}</text>
    <text x="${valueX}" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - padding) * 10}">${value}</text>
    <text x="${valueX}" y="130" transform="scale(.1)" textLength="${(valueWidth - padding) * 10}">${value}</text>
  </g>
</svg>`;
}
/**
 * Read a .taf file and extract the latest test run.
 */
function getLatestRun(tafPath) {
    if (!fs.existsSync(tafPath)) {
        return null;
    }
    const content = fs.readFileSync(tafPath, 'utf-8');
    // Handle YAML document separators (same logic as taf-core.ts)
    const lines = content.split('\n');
    const yamlLines = [];
    for (const line of lines) {
        if (line.trim() === '---' && yamlLines.length > 0)
            break;
        if (line.trim() === '---' && yamlLines.length === 0)
            continue;
        yamlLines.push(line);
    }
    const parsed = yaml.parse(yamlLines.join('\n'));
    if (!parsed || typeof parsed !== 'object')
        return null;
    if (!Array.isArray(parsed.test_history) || parsed.test_history.length === 0)
        return null;
    const latest = parsed.test_history[parsed.test_history.length - 1];
    if (!latest.tests || typeof latest.tests.total !== 'number')
        return null;
    return {
        passed: latest.tests.passed ?? 0,
        total: latest.tests.total,
        failed: latest.tests.failed ?? 0,
        skipped: latest.tests.skipped ?? 0,
    };
}
/**
 * Generate a badge SVG from a .taf file.
 */
function generateBadge(options = {}) {
    const label = options.label || 'TAF';
    const tafPath = options.tafPath || '.taf';
    try {
        const run = getLatestRun(tafPath);
        if (!run) {
            return {
                success: true,
                svg: renderBadgeSvg(label, 'no data', COLOR_NONE),
            };
        }
        const skippedSuffix = run.skipped > 0 ? ` (${run.skipped} skipped)` : '';
        const displayPassed = run.failed === 0 ? run.total : run.passed;
        const value = `${displayPassed}/${run.total} passing${skippedSuffix}`;
        const color = run.failed === 0 ? COLOR_PASS : COLOR_FAIL;
        return {
            success: true,
            svg: renderBadgeSvg(label, value, color),
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate badge',
        };
    }
}
//# sourceMappingURL=badge.js.map