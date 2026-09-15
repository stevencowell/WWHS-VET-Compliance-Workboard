# Online Morning Launchpad

Address: https://stevencowell.github.io/WWHS-VET-Compliance-Workboard/morning-launchpad/

This is the same standalone links and daily-plan app used locally. Only the generated HTML, JavaScript, CSS and favicon are published. The public page has no account login. Daily plans, saved favourites and appearance settings remain in the visitor's browser; they are not uploaded or synchronised between computers. Mail, notes, timetable snapshots, source data and backups are excluded from the export. The page blocks background network connections through its Content Security Policy.

The local and online addresses have separate browser storage. Existing local plans remain at http://localhost:4318/. To move selected plans, use the existing Saved plans and backup controls to export from the local page and import at the online address. Existing days take precedence during import. Keep the backup until the imported plans have been checked.

The TAS/VET Hub links to this online page. Main Page is an outgoing shortcut only; no Launchpad return link has been added to the student site.

## Update

Maintain the source in the installed Morning Launchpad project. Build that app, then run this repository's exporter with the generated `dist-links` directory:

```text
node scripts/export-launchpad.mjs <path-to-morning-launchpad/dist-links>
```

The exporter allows only the four assets referenced by the generated page and creates relative links so the page works in its GitHub Pages subdirectory. It also refreshes `docs/morning-launchpad-2026-09-15.sha256`. Review and publish those output files through the normal workboard release process. Do not recursively copy the local Launchpad folder.
