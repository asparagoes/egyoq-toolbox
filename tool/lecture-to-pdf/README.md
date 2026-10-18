# Lecture to PDF

Static, browser-local lecture slide extraction. Open through a static web server, select a browser-decodable video, set the crop, scan, review, and download an image-only PDF.

Scanning seeks at the configured interval and compares 192 × 108 luminance samples. Two similar neighboring samples establish a stable candidate; the latest stable timestamp is retained. A noise floor reduces compression/cursor changes. Optional conservative directional pixel-change detection merges likely incremental builds. This is heuristic: review results, especially for diagrams, scrolling, reversed text colors, brief slides, and fades. Revisiting an earlier slide is preserved in lecture order.

Only small JPEG thumbnails, signatures, and timestamps are retained during scanning. PDF export seeks back to selected timestamps and embeds JPEGs directly with a local PDF writer. Export memory grows with the number and resolution of selected slides; use 1280 px for smaller PDFs. No uploads, external scripts, OCR, or exact frame enumeration. Reloading clears results. Crop is locked while results exist to keep captures and exports consistent.

Metadata follows the toolbox generator's `tool:description`, `tool:tags`, and `tool:emoji` conventions. No build or runtime packages required.
