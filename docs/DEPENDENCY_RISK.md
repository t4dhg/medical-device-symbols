# Dependency risk

This point-in-time record covers the complete installed dependency tree. It is evidence from one audit, not a guarantee that the dependency tree will remain free of advisories.

## Audit snapshot

- Audit date: `2026-08-27`
- Command: `npm audit --json`
- Result: `0 info, 0 low, 0 moderate, 0 high, 0 critical; 0 total`
- Dependency metadata: `1 production, 38 development, 26 optional, 0 peer, 0 peer-optional; 38 total`

| Finding             | Severity | Dependency path    | Runtime reachability              | Fix availability | Mitigation                                                            |
| ------------------- | -------- | ------------------ | --------------------------------- | ---------------- | --------------------------------------------------------------------- |
| No advisories found | None     | No vulnerable path | Not applicable; no finding exists | Not applicable   | Keep the CI production audit and repeat the full audit before release |

The npm metadata categories can overlap, so their individual counts are not expected to sum to the reported total. If a future full audit reports a vulnerability, replace the zero-finding row with one row per reviewed finding and record its exact dependency path, runtime reachability, available fix, and current mitigation.
