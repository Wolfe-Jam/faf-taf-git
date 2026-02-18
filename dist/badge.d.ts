/**
 * Badge Generator for faf-taf-git
 *
 * Generates shields.io-style SVG badges from .taf test history.
 * Self-contained SVG with Verdana font, no external dependencies.
 */
export interface BadgeOptions {
    tafPath?: string;
    label?: string;
}
export interface BadgeResult {
    success: boolean;
    svg?: string;
    error?: string;
}
/**
 * Render a shields.io flat-style SVG badge.
 */
export declare function renderBadgeSvg(label: string, value: string, color: string): string;
/**
 * Generate a badge SVG from a .taf file.
 */
export declare function generateBadge(options?: BadgeOptions): BadgeResult;
//# sourceMappingURL=badge.d.ts.map