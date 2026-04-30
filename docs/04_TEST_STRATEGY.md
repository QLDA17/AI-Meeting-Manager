# Core Release Test Strategy

## Frontend TDD backlog
- Mapper normalization
  - `normalizeUser` maps auth/profile payloads correctly.
  - `normalizeOrganization` maps count fields and timestamps.
  - `normalizeGroup` maps privacy/count fields.
  - `normalizeMeetingDetail` lifts transcript/summary/action items into one FE shape.
- Auth and routing
  - Login stores token and current org.
  - `PublicOnlyRoute` redirects authenticated users correctly.
  - Role-based pages hide settings/admin actions for non-admin roles.
- Store synchronization
  - Switching org reloads groups, members, and meetings.
  - Group detail reloads group, members, and meetings together.
  - Action item mutations invalidate list state correctly.
- Feature gating
  - Upload page shows disabled fallback when `uploadEnabled = false`.
  - System admin console renders phase-2 placeholder when system features are not enabled.

## Integration backlog
- Auth
  - `POST /api/auth/login` + `GET /api/auth/me`
  - token attachment on subsequent requests
- Organization and group
  - create group -> group list refresh -> group detail visible
  - invite preview -> register with invite -> accept invite
- Meetings
  - create meeting -> list meetings -> open meeting detail
  - meeting detail returns transcript/summary/action items in one payload
- Action items
  - list all visible items
  - create/update/delete item
  - filter by `meeting_id` and `status`
- Notifications
  - notifications feed reflects recent meeting activity

## Backend TDD backlog
- Register with `orgName` auto-creates org + org-admin membership.
- Meeting detail response contains:
  - organization metadata
  - group metadata
  - transcripts
  - summaries
  - action items
  - flattened transcript/summary text fields
- Dashboard stats return stable camelCase shape.
- Feature flags endpoint returns upload/job/system admin availability.
- Permission matrix for:
  - org member
  - org admin
  - group admin
  - viewer
