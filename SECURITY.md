# Security Policy

## Supported Versions

Only the latest 2.x release line receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Instead, use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**, or go directly to https://github.com/t4dhg/medical-device-symbols/security/advisories/new.

Please include a description of the issue, the affected version(s), and steps to reproduce where applicable. You can expect an initial response within a few days.

## Security Model

This package ships static, self-contained React SVG icon components. Its attack surface is intentionally minimal:

- **Zero runtime dependencies.** React is a peer dependency; nothing else is pulled in at runtime.
- **No I/O at runtime.** The components make no network requests and do not touch the file system or environment.
- **No runtime user input is processed.** Icon markup is inlined from trusted SVG source files at build time. Each component passes that build-time-constant markup to React's `dangerouslySetInnerHTML`; no caller-supplied or end-user-supplied value is ever injected into it, so there is no user-controlled markup-injection path.
- **Props are handled by React.** Any props you pass (`size`, `className`, `style`, event handlers, and other SVG attributes) are applied to the outer `<svg>` element through React's normal, escaped rendering path.

If you render untrusted data alongside these icons in your own application, standard application-level sanitisation of that data still applies.
