# Local connection-check integration

Local source commit `2f865a0b7cc1be693d76c914c68ffce01da09216` added a README example and `verify_connection.js` to a separate checkout. Its intended function is already covered by `npm run tv -- status`: both call the existing `healthCheck` core operation. This integration documents and tests that native command instead of adding a second runner. The original local commit and its files remain unchanged.

The native CLI respects the configured CDP endpoint and uses JSON output. Unlike the old script, caught connection failures produce a nonzero exit code. Offline regression tests replace only the health core module, then exercise the actual CLI registration and router for success, connection failure, and another thrown error. No live Desktop session or trading action is used.

The error-handling sweep checked the CLI router/commands, scripts, and test runners for caught connection errors reported with a success exit. The redundant local verification runner was the confirmed occurrence; it is not imported. Existing `pine check` reports valid compiler diagnostic results with exit 0 by design and is outside this connection-check contract. The original runner remains in its source checkout for preservation, so these guarantees apply to the documented native command.

The staged `AGENTS.md` is already present unchanged on the user's fork. No agent rules are modified. Publication target is `leoguu67/tradingview-mcp`, not the upstream repository.
