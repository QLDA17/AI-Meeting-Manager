# End-to-End Acceptance Scenarios

## 1. Login and org bootstrap
1. User opens login page.
2. User submits valid credentials.
3. System stores bearer token and loads `/api/auth/me`.
4. First organization becomes active context.
5. Dashboard loads meetings, groups, and stats for that organization.

## 2. Org admin creates a group
1. Org admin opens organization admin.
2. Org admin creates a new group.
3. Group appears in org groups list.
4. Group appears in dashboard/group navigation.
5. Creator is present as `group-admin` in group members.

## 3. Invitation lifecycle
1. Org admin sends invitation to a new email.
2. Invite preview page shows organization and target role.
3. Invited user registers with invite token.
4. User logs in and accepts invitation.
5. User appears in organization member list.

## 4. Group collaboration
1. Group member opens group detail page.
2. Members tab shows live members from API.
3. Chat tab loads messages from API.
4. User sends a message.
5. User edits reaction / pins / deletes according to permission.

## 5. Meeting lifecycle
1. User creates a meeting inside a group.
2. Meeting appears in dashboard recent/upcoming lists.
3. Meeting appears in global meeting list.
4. Group detail meetings tab reflects the new meeting.
5. Meeting detail loads from `/api/meetings/{id}`.

## 6. Meeting detail fidelity
1. Open a meeting with transcript and summary data.
2. Summary tab shows summary, key points, decisions.
3. Transcript tab shows transcript content or transcript link.
4. Actions tab shows action items from the same payload.
5. Organization and group context are visible in header/sidebar.

## 7. Action item workflow
1. User opens action items page.
2. User creates a new action item.
3. Item appears immediately in list.
4. User changes status.
5. User deletes item.
6. Filtering by status still returns correct rows.

## 8. Notifications feed
1. User opens notifications page.
2. Feed loads recent meeting events.
3. Newly created meeting generates a “meeting created” notification.
4. Upcoming meeting within 24h generates an upcoming notification.
5. Completed meeting generates a completion notification.

## 9. Upload capability disabled
1. User opens upload page while `uploadEnabled = false`.
2. Page clearly states upload pipeline is unavailable.
3. File chooser and submit path are disabled.
4. User still has a safe fallback to create meeting manually.

## 10. Upload capability enabled
1. User opens upload page while `uploadEnabled = true`.
2. User selects org/group and audio file.
3. Frontend submits file to backend.
4. Frontend polls job status.
5. Processed meeting becomes available in meeting detail with transcript/summary.
