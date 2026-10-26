# Aurora — Personal Productivity Dashboard

A React + Vite personal dashboard with an Aurora Glass theme.

## Features
- Default routine: Class 2h, Work 2h, Study 2h, Practice 1h
- Customizable daily target hours
- Log actual hours separately from targets (including over-target hours)
- Add personal, home, friends, urgent, and other tasks
- Mark tasks complete, delete tasks, and log time spent on extra tasks
- Compare actual hours with the previous day
- 7-day activity chart
- Animated voice assistant placeholder for future implementation
- Browser localStorage persistence

## Run locally

Requirements: Node.js (LTS recommended).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## Data and privacy
Records are stored in the current browser's localStorage. This starter does not use a remote database or account login. Browser data is local to this browser/profile and is not automatically synced across devices. Export/backup and a secure database can be added later if needed.

## Notes
- Historical comparisons become more useful after you log activity on multiple dates.
- The voice assistant is a visual placeholder only; speech recognition, spoken responses, and notifications are intentionally deferred.
