# Live classes: secure joining and automatic recording

## What we need

1. Only paid students can join a live class, and a link a student forwards must not let anyone else in.
2. Every class is recorded automatically, with no action by the teacher.
3. Nothing is ever recorded on, or uploaded from, a teacher's computer.
4. The finished recording lands in the academy's Google Drive without anyone touching it.
5. Students watch it on demand for 48 hours after they request it, can't download it, and can't keep it.

Items 4 and 5 and the "paid students only" check (class-access) are already built. The gap is the live
video itself.

## Why not Google Meet on a personal account (tested 14 Oct 2026)

| Needed | Result on your Google account |
|---|---|
| Recording starts by itself | Works, but only when the academy (host) account is in the room |
| Teacher can trigger recording | No: adding a co-host is refused ("not available to the user") |
| Invite-only room | No: refused ("not available to the user") |
| Add invited guests | Yes |

Recording would depend on the academy login being present in every class, and a forwarded link could
only be stopped by a host admitting people one by one. A paid Workspace plan would probably lift these
limits, but that is unverified.

## The plan: Zoom as the classroom, the app as the gatekeeper and the archive

```
Student presses Join in the app
  -> server checks: in this batch? class live? enrolment active? fees paid (2-day grace)?
  -> server registers the student for THIS Zoom meeting and returns their personal join link
Teacher presses Start in the app
  -> server returns the host start link (valid only for that class)
Zoom records to ITS cloud automatically (local recording is switched off for the whole account)
Class ends -> Zoom tells our server a recording is ready (signed notice)
  -> server streams it from Zoom straight into the academy's private Drive folder
  -> verifies it arrived complete, then deletes it from Zoom
  -> creates the recording in the app (locked, 48-hour on-request, watermarked, no download)
```

### Why this is strong

- **Personal join links.** Each paid student gets their own link for each class. Sharing it doesn't give
  a second person a seat, and the unpaid never receive one. Teachers see real student names in the room.
- **No class link in any page.** The link is issued by the server at the moment of joining. Already true
  for the current Meet link and the same rule is reused.
- **Recording is the platform's job.** It happens in Zoom's cloud whoever joins, so a teacher can't
  forget it, stop it, or keep a copy.
- **No teacher login to the academy account.** Teachers use a per-class host link issued by the app. They
  never know the Zoom password, and the link stops working after the class.
- **Recordings never pass through a person.** Zoom to server to Drive, then removed from Zoom.
- **Reuses what is built:** private streaming, the 48-hour window, the student-name watermark, paid-only
  checks, the staff exception, audit log.

### Controls in detail

| Risk | Control |
|---|---|
| Unpaid student gets in | Server-side fee check before issuing a link; staff exception is time-limited and logged |
| Paid student forwards the link | Personal registration link per student per class; waiting room on; teacher sees names |
| Stranger guesses the meeting | Registration required, passcode on, waiting room on, no "join before host" |
| Fee stops mid-month | Student's registration for later classes is cancelled automatically |
| Teacher records locally | Local recording disabled at the Zoom account level |
| Teacher keeps or shares recordings | They never receive a file; only the server touches the video |
| Fake "recording ready" notice | Every notice is signature-checked and must be recent |
| Drive or Zoom outage | Recording import retries automatically; failures show in Admin → System Health |
| Zoom account taken over | Two-step login on the Zoom account; app credentials stored encrypted |
| Someone films their screen | Cannot be prevented; the watermark with their name and phone is the deterrent |

## Build phases

1. **Zoom account setup (you).** Paid plan, an app for the server to use, the account settings above, a
   webhook address. I give you an exact click-by-click checklist.
2. **Connection.** Save the Zoom credentials in Settings → Integrations (encrypted, like Google). Test
   connection button. A small pool of licensed hosts so overlapping classes each get a free one, and a
   clear warning when two classes at the same hour need more licences than you have.
3. **Classes.** Creating a class makes a Zoom meeting (registration, passcode, waiting room, automatic
   cloud recording). The Meet option stays only as a clearly labelled manual fallback.
4. **Joining.** Student Join and teacher Start buttons use the new flow, with the same payment rules and
   messages. Cancelled registrations when fees lapse.
5. **Recordings.** Signed notice from Zoom, copy into Drive, verify, delete from Zoom, create the
   recording. Retry job for failures.
6. **Real-world test with you.** Two phones and a computer: a paid student, an unpaid student, a forwarded
   link, a teacher, a full class, then checking the recording arrives and plays under the 48-hour rules.
7. **Hardening and launch checks.** Two-step login on Zoom, alerting, a written runbook.

## What it costs and needs

- A paid Zoom plan per host licence. One licence per class running at the same time. Students join free.
- Students join with the free Zoom app on their phone or computer.
- Your existing Drive storage holds the recordings; Zoom is only a short waiting room for them.

## Decisions (agreed 14 Oct 2026)

1. **Zoom** is the classroom platform.
2. **One class at a time** to start, so **one Zoom host licence**. The app must refuse to schedule a second
   class that overlaps another, with a clear message, until more licences are added.
3. **Grace period: 2 days** after a due date before an unpaid fee stops a student joining.
4. **Teachers start the class from a button in the app**, with no Zoom login.

## Open items we verify while building

- Exactly how Zoom treats a personal link used on two devices (we test on real phones).
- Zoom's current limits on registrants per meeting and on recording notices.
- The Zoom watermark option for shared screens on your plan.

## Recording pipeline (built)

1. Zoom records the class in its cloud (automatic) and sends `recording.completed` to `<site>/api/zoom/webhook`.
2. The route checks Zoom's signature (Secret Token from Settings → Integrations → Zoom, 5-minute replay window), queues a `ZoomRecordingJob`, replies at once, then copies after the reply.
3. The file streams from Zoom straight into the private Drive folder in 16 MB pieces (never on a teacher's computer or the server's disk), the size is checked against what Zoom announced and what Drive stored, and only then a `ClassRecording` is created (48-hour request window, watermark, no download all apply as before).
4. Only after that is the recording deleted from Zoom (keeps the 10 GB cloud quota free).
5. Failures retry after 5, 15, 30, 60 and 180 minutes (the `zoom-recordings` job runs every 10 minutes); after that the job shows as FAILED in Admin → System Health with a Retry button. A recording is never deleted from Zoom unless the Drive copy was verified.
6. `meeting.ended` marks the class COMPLETED once its scheduled end is near/passed.

Zoom Marketplace → your app → Event Subscriptions: add `<site>/api/zoom/webhook` and subscribe to Recording → "All Recordings have completed" and Meeting → "End Meeting". Also subscribe to Meeting → "Participant/Host joined meeting" and "Participant/Host left meeting" (join alerts). Click Validate (the app answers automatically).

## Keeping students with the academy (privacy rules)

- Phone numbers, WhatsApp, email and address of students and parents are visible to Super Admin / Admin only (and to the student or parent themselves). Teachers see a notice instead; the server removes the fields before the page is built (`src/lib/privacy.ts`).
- Messages, doubts, announcements, homework text and feedback refuse phone numbers, emails and messaging-app/social-media invitations (`src/lib/contact-filter.ts`, applied by `src/lib/contact-guard.ts`). Refusals are listed in Admin → System Health → "Blocked Contact Sharing". Admins and counselors are exempt.
- Zoom has its own chat that the app cannot filter. In the Zoom web portal → Settings → Meeting → In Meeting (Basic): set Chat → "Allow participants to chat with" to "Host only" (or off), turn off Private chat, turn off "Allow participants to rename themselves", and turn on "Prevent participants from saving chat". Also Screen sharing → "Host only".
