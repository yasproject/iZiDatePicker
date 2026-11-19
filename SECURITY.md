# Security policy

## Supported versions
The latest minor release of the current major version receives security fixes.

## Reporting a vulnerability
Please **do not** open a public issue. Use GitHub's private vulnerability reporting (Security tab -> "Report a vulnerability") on this repository. Include a description, a minimal reproduction and the affected version. You can expect an acknowledgement within a few days.

## Scope notes
iZiDatePicker renders untrusted strings (holiday titles, locale strings, hook return values) with `textContent`; a string returned from `renderDay`/`renderHeader`/`renderFooter` is inserted as text, never as HTML. Reports that show a way around this are in scope.
