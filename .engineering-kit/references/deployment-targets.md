# Deployment target decisions

These are planning cues, not provider-specific executable runbooks. Verify current provider documentation for the selected plan and runtime before generating commands.

| Target | Fit and prerequisites | Release and recovery concerns |
| --- | --- | --- |
| cPanel/shared hosting | Supported PHP/Node runtime, document root isolation, SSH/build access, cron and database limits | Build elsewhere if needed; prevent public env/config files; versioned artifact backup; verify workers and symlink support |
| VPS | Team can patch OS, proxy/TLS, process manager and firewall | Least-privilege service user; release directories; health checks; OS and data backup; operator ownership |
| Docker | Compatible runtime and image registry; host supports containers | Non-root image, pinned base policy, external secrets/durable volumes, one-off migrations, previous image plus compatible schema |
| Vercel | Supported framework and function constraints | Verify timeouts, region, connection pooling, external storage and jobs; preview/production separation; artifact rollback does not undo data |
| Render | Appropriate web/worker/database service and plan | Verify start/build/health checks, storage persistence, migrations, backup retention, graceful shutdown and rollback behavior |

For every target, document environment variable names, secret delivery, TLS, production error behavior, migrations, backups, restore, rollback, logs and monitoring. Twelve-Factor principles are useful design references, not a requirement to rewrite a suitable shared-hosting application. Live changes require authorization.
