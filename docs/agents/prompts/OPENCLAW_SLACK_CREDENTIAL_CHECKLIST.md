# OpenClaw Slack Credential Checklist

Use this checklist before any Slack control-plane dummy validation.

Do not write real token values in this file.

## Slack App

- [ ] Slack app created for Spectix OpenClaw control.
- [ ] Socket Mode enabled.
- [ ] App-level token created and stored locally as `SLACK_APP_TOKEN`.
- [ ] Bot token created and stored locally as `SLACK_BOT_TOKEN`.
- [ ] Optional signing secret recorded locally as `SLACK_SIGNING_SECRET` only if
      required.
- [ ] Bot scopes match the installed OpenClaw Slack setup manifest or approved
      updated manifest.
- [ ] Event subscriptions enabled for Socket Mode.
- [ ] App installed to workspace.

## Private Control Channel

- [ ] Private control channel created.
- [ ] Channel membership restricted to approved operators.
- [ ] Bot invited to private control channel only.
- [ ] Control channel ID recorded locally as `SLACK_CONTROL_CHANNEL_ID`.
- [ ] Approved user IDs recorded locally as `ALLOWED_SLACK_USER_IDS`.
- [ ] No production credentials or claim PII posted in channel.

## Local OpenClaw Config

- [ ] Credentials stored outside git.
- [ ] Credentials not stored in docs.
- [ ] Credentials not stored in `.env.local` unless explicitly required and
      ignored.
- [ ] `openclaw config validate` passed.
- [ ] `openclaw config get cron` confirms `enabled = false`.
- [ ] Gateway remains loopback-only.
- [ ] Auto-merge disabled.
- [ ] Auto-deploy disabled.
- [ ] Public webhooks disabled.

## Dummy Validation

- [ ] Foreground loopback gateway test approved.
- [ ] Gateway started only with `openclaw gateway run --bind loopback`.
- [ ] `/oc status` passed in private Slack control channel.
- [ ] `/oc next` passed in private Slack control channel.
- [ ] `/oc handoff TASK-SPECTIX-001 --role pm` passed in private Slack control
      channel.
- [ ] Gateway stopped after test.
- [ ] No repo files changed.
- [ ] No app code changed.
- [ ] No DB rows mutated.
- [ ] No secrets printed.
- [ ] No production data touched.
- [ ] Cron/24-7 still disabled.
