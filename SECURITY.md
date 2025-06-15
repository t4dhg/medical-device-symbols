# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this package, please report it by:

1. **Do not** open a public issue
2. Email the maintainer directly at: [your-email@example.com]
3. Include a detailed description of the vulnerability
4. Include steps to reproduce if applicable

We will respond to security reports within 48 hours and provide a timeline for fixes.

## Security Considerations

This package:

- Contains only CSS and TypeScript code
- Has no runtime dependencies
- Uses only CSS counters (no JavaScript execution)
- Does not process user input at runtime
- Does not make network requests

The package is designed to be secure by default with minimal attack surface.
