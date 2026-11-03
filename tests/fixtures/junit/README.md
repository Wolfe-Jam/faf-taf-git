# JUnit fixtures: real reports from real runners

Every `.xml` file here was written by the runner named in it, from a tiny project
with **2 passing, 1 failing, 1 skipped** test plus the extra shape listed. None of
them was hand-written or edited to make a test pass. `tests/junit-matrix.test.ts`
checks each one against the runner's **own** summary line, recorded below.

Generated 2026-11-03 on Linux x64 (Ubuntu 24.04), Node v22.23.4.

| File | Runner (version) | Command | Extra shape | Runner's own summary line |
|---|---|---|---|---|
| `pytest.xml` | pytest 9.1.1 (Python 3.13.18) | `pytest --junitxml=report.xml` | a test that errors in a fixture (setup error) | `1 failed, 2 passed, 1 skipped, 1 error` |
| `gotestsum.xml` | gotestsum v1.13.0 (go1.24.7) | `gotestsum --junitfile report.xml -- ./...` | a subtest (`t.Run`) | `DONE 5 tests, 1 skipped, 1 failure` |
| `cargo-nextest.xml` | cargo-nextest 0.9.151 (cargo 1.97.0) | `cargo nextest run --profile ci` (`[profile.ci.junit] path = "junit.xml"` in `.config/nextest.toml`) | an `#[ignore]` test | `3 tests run: 2 passed, 1 failed, 1 skipped` |
| `jest-junit.xml` | Jest 30.5.2 + jest-junit 17.0.0 | `jest --reporters=default --reporters=jest-junit` | a `describe` inside a `describe` | `Tests: 1 failed, 1 skipped, 2 passed, 4 total` |
| `vitest.xml` | Vitest 5.1.0 | `vitest run --reporter=junit --outputFile=report.xml` | a `describe` inside a `describe` | `Tests  1 failed \| 2 passed \| 1 skipped (4)` |
| `node-test.xml` | node:test (Node v22.23.4) | `node --test --test-reporter=junit --test-reporter-destination=report.xml` | top-level tests beside a nested `describe`, and a `todo` | `tests 5 · pass 2 · fail 1 · skipped 1 · todo 1` (from the report's own trailing comments) |
| `mocha.xml` | mocha 12.0.3 | `mocha --reporter xunit --reporter-option output=report.xml` | a nested `describe` | `2 passing · 1 pending · 1 failing` |
| `maven-surefire-FirstTest.xml`, `maven-surefire-SecondTest.xml` | Maven 3.9.11, Surefire 3.5.2, JUnit Jupiter 5.11.4 (OpenJDK 21.0.12) | `mvn test` (`target/surefire-reports/TEST-*.xml`) | two test classes, one file each | `Tests run: 4, Failures: 1, Errors: 0, Skipped: 1` |
| `phpunit.xml` | PHPUnit 12.5.43 (PHP 8.3.6) | `phpunit --log-junit report.xml tests` | a data provider (nested suites) | `Tests: 4, Assertions: 3, Failures: 1, Skipped: 1.` |
| `dotnet.xml` | .NET SDK 8.0.133, xUnit 2.4.2, JunitXml.TestLogger 8.1.0 | `dotnet test --logger "junit;LogFilePath=report.xml"` | a skipped `[Fact(Skip=…)]` | `Failed! - Failed: 1, Passed: 2, Skipped: 1, Total: 4` |

The Maven classes split the four tests: `FirstTest` has 1 passing + 1 failing,
`SecondTest` has 1 passing + 1 skipped (`@Disabled`). In the PHPUnit project the
two passing tests are the two data sets of one data-provider test. In the Go
project the subtest is an extra passing testcase (gotestsum counts a parent and
its subtest as two tests).

PHPUnit's GitHub dist zips could not be downloaded in the build environment, so
PHPUnit and its dependencies were checked out by git at the exact commits in a
`composer require phpunit/phpunit:^12` lock file, with a Composer-generated
autoloader. The runner code is unmodified PHPUnit 12.5.43.

## What was stripped

The only changes made to the runners' output, so no machine detail is committed:

- **Paths:** the absolute path of each sample project (a `/tmp/…` scratch
  directory) was removed from stack traces and `file=` attributes, leaving
  project-relative paths (`sample.test.js:6:36`).
- **Hostnames:** every `hostname="…"` attribute was removed.
- **Surefire `<property>` elements:** Maven writes the JVM's system properties
  (user home, working directory, class path, OS user) into every report. Those
  `<property …/>` lines were removed; the empty `<properties>` element is left.

No counts, testcases, attributes or results were changed.

## Known gaps

- **cargo nextest leaves ignored tests out of its JUnit report.** The summary
  says `1 skipped`, but the XML has `tests="3" skipped="0"` and no `<testcase>`
  for the `#[ignore]` test. No parser can recover that skip from the file; the
  matrix keeps it as a `test.failing` case.
- **Maven writes one file per class.** `cat target/surefire-reports/TEST-*.xml`
  gives the runner's own counts; a single file gives only that class (and can
  read PASSED for a run that failed).
