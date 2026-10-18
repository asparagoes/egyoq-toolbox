# Lecture to PDF

Static, browser-local lecture slide extraction. Open through a static web server, select a browser-decodable video, set the crop, scan, review, and download an image-only PDF.

Scanning seeks at the configured interval and compares 192 × 108 luminance samples. Two similar neighboring samples establish a stable candidate; the latest stable timestamp is retained. A noise floor reduces compression/cursor changes. Optional conservative directional pixel-change detection merges likely incremental builds. This is heuristic: review results, especially for diagrams, scrolling, reversed text colors, brief slides, and fades. Revisiting an earlier slide is preserved in lecture order.

Only small JPEG thumbnails, signatures, and timestamps are retained during scanning. PDF export seeks back to selected timestamps and embeds JPEGs directly with a local PDF writer. Export memory grows with the number and resolution of selected slides; use 1280 px for smaller PDFs. No uploads, external scripts, OCR, or exact frame enumeration. Crop is locked while results exist to keep captures and exports consistent.

The most recent session is saved in IndexedDB on this browser: selected and excluded slides, thumbnails, comparison signatures, crop and settings, and the resumable scan checkpoint. Saves happen every five samples, on pause/completion, after review edits, and when the document becomes hidden. An abrupt termination can lose samples since the latest completed save. The video itself is not stored. After reloading, choose the same video (verified by filename, byte size, and modification time), then Resume scan or export restored results. A different file is rejected until Clear results removes the prior session. Clearing browser/site data removes saved progress. Storage errors are shown explicitly; private browsing may not retain storage after closing.

Scanning does not require the tab to be visible. Background tabs may be throttled or suspended by the browser or OS; a fully closed tab cannot process video. Resume continues from the saved sample with the pending candidate and last comparison intact, so it does not restart or duplicate a slide at the checkpoint. An unload warning protects an active scan/export from accidental navigation. This is a single recent-session save; use one tab for a lecture.

Metadata follows the toolbox generator's `tool:description`, `tool:tags`, and `tool:emoji` conventions. No build or runtime packages required.
