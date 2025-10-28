# Contributing to FAF TAF Action

Thank you for considering contributing to the FAF TAF Action!

## Philosophy

We follow the **WJTTC (WolfeJam Technical & Testing Center)** philosophy:

> "We break things so others never know they were broken."

This means:
- Test everything
- Find bugs early
- Fix them immediately
- Maintain championship standards

## Code of Conduct

- Be professional
- Be respectful
- Focus on facts
- Trust is everything
- No BS - only verified claims

## Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- TypeScript knowledge

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Wolfe-Jam/faf-taf-action.git
cd faf-taf-action

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run integration tests
npx tsx test-standalone.ts
npx tsx test-mcp.ts
```

## Project Structure

```
faf-taf-action/
├── src/
│   ├── index.ts          # Main action entry point
│   ├── taf-core.ts       # MCP-portable TAF operations
│   └── parsers/
│       └── jest.ts       # Jest output parser
├── tests/
│   └── jest-parser.test.ts  # Unit tests
├── docs/
│   ├── USER-GUIDE.md     # User documentation
│   └── RELEASE-NOTES.md  # Release history
├── action.yml            # Action definition
└── package.json          # Dependencies
```

## How to Contribute

### 1. Report Bugs

Open an issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Minimal reproduction case

### 2. Suggest Features

Open an issue with:
- Use case description
- Why it's valuable
- Proposed implementation (optional)
- Alternatives considered

### 3. Submit Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## Coding Standards

### TypeScript

- Use strict mode (already configured)
- Explicit types everywhere
- No `any` unless absolutely necessary
- Descriptive variable names
- Functions should be pure when possible

### Testing

- All new code must have tests
- Maintain 100% coverage for critical paths
- Use descriptive test names
- Test both success and failure cases

### Documentation

- Update README.md for user-facing changes
- Update USER-GUIDE.md for new features
- Add inline comments for complex logic
- Keep CLAUDE.md synchronized

### Commits

Follow our git protocol:

```
<type>: <what changed>

- <specific change 1>
- <specific change 2>
```

**Types:** `fix:` `feat:` `docs:` `refactor:` `chore:` `test:`

**Examples:**
```
fix: Handle Jest output with skipped tests

- Add skipped count parsing
- Update test result interface
- Add unit tests for skipped tests
```

```
feat: Add Mocha parser support

- Create mocha.ts parser
- Add Mocha output format detection
- Update documentation
- Add integration tests
```

**Never:**
- No exclamation marks
- No emotion or hype
- No "finally" or "at last"
- Keep it boring and professional

## Adding Test Framework Support

To add support for a new test framework:

### 1. Create Parser

Create `src/parsers/[framework].ts`:

```typescript
export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  result: 'PASSED' | 'FAILED' | 'IMPROVED' | 'DEGRADED';
}

export function parseFrameworkOutput(output: string): TestResults | null {
  // Parse framework-specific output
  // Return null if output doesn't match format
}
```

### 2. Add Tests

Create `tests/[framework]-parser.test.ts`:

```typescript
import { parseFrameworkOutput } from '../src/parsers/framework';

describe('Framework Parser', () => {
  it('should parse all passing tests', () => {
    const output = `...`;
    const result = parseFrameworkOutput(output);
    expect(result?.total).toBe(10);
    // ... more assertions
  });

  // Test all output variations
});
```

### 3. Update Main Entry

Modify `src/index.ts` to detect and use the new parser.

### 4. Update Documentation

- Add to README.md supported frameworks list
- Add examples to USER-GUIDE.md
- Update RELEASE-NOTES.md

## Testing Requirements

Before submitting a PR:

```bash
# All unit tests must pass
npm test

# Build must succeed with no errors
npm run build

# Integration tests must pass
npx tsx test-standalone.ts
npx tsx test-mcp.ts

# TypeScript must compile with no errors
npx tsc --noEmit
```

## Review Process

1. **Automated Checks**
   - TypeScript compilation
   - Test suite (must be 100%)
   - Linting

2. **Code Review**
   - Architecture fit
   - Code quality
   - Test coverage
   - Documentation

3. **Testing**
   - Manual testing if needed
   - Integration verification

4. **Approval & Merge**
   - Squash and merge
   - Clean commit history

## Release Process

Releases follow semantic versioning:

- **Major** (v2.0.0): Breaking changes
- **Minor** (v1.1.0): New features, backward compatible
- **Patch** (v1.0.1): Bug fixes

Release checklist:
1. Update version in package.json
2. Update RELEASE-NOTES.md
3. Run full test suite
4. Build and verify dist/
5. Create git tag
6. Push to GitHub
7. Create GitHub release
8. Announce in discussions

## Championship Standards

We maintain F1-inspired engineering standards:

- **Methodical**: Not a race, do it right
- **Tested**: WJTTC certified
- **Professional**: Boring is good
- **Trusted**: Facts only, no hype

## Questions?

- GitHub Discussions: https://github.com/Wolfe-Jam/faf/discussions
- Email: happy@faf.one

Thank you for contributing to the Golden Triangle!
