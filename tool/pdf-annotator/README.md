# Margin / PDF Annotator

Static, browser-local tool. Serve the toolbox with any static HTTP server and open `tool/pdf-annotator/`. No build step or accounts. PDF.js 4.10.38 (Apache-2.0) renders documents and selectable text; pdf-lib 1.17.1 (MIT) exports the original PDF with transparent annotation overlays. Both libraries and PDF.js styles load from pinned jsDelivr URLs, so an internet connection is required. This is a custom interface using those libraries, not a fork of Edge.

## Use

- Open a PDF, or try the practice page.
- Select text, then choose Highlight or Add note from the floating toolbar. Double-click selects a word using browser selection; triple-click selects a paragraph inferred from neighboring text lines.
- Text: click a page, type, then drag the lower-right green corner to scale the text and box together. Drag the outlined handle just above it horizontally to change width and wrapping without changing font size. The grip above the text moves the box. Size and color controls also edit the last focused text annotation.
- Draw: drag a pen stroke. Erase: click an annotation. Undo/redo supports annotations and text editing sessions.
- Notes appear in the notes panel. Delete them there. Notes are numbered on exported pages and their text is included in appended notes pages.
- Download PDF creates a flattened annotation overlay while retaining the original PDF underneath. Save project creates an editable JSON file containing the source PDF and annotations. Reopen it with Open project. IndexedDB also saves the most recent document locally.

## Limits

Scanned PDFs require OCR elsewhere before selecting text. PDF paragraph structure is inferred and may differ for tables or complex layouts. Exported annotations are flattened, so use the project file for further edits. Notes appendix currently substitutes non-Latin characters with `?`; text annotations render through the browser and preserve supported Unicode glyphs. PDF export does not preserve digital signatures. This initial version renders all pages, so large documents can use substantial memory. Browser storage is a convenience; download a project for durable work. Shared-device users should use separate browser profiles because the last saved document is restored automatically.

## Verification

`node --check app.mjs` checks syntax. `node ../../../tests/pdf-annotator.test.cjs` from this folder tests annotation geometry, text wrapping, project round trips, and PDF overlay placement at all four page rotations. UI verification requires a browser that can reach the local server and jsDelivr.


## Zoom and shortcuts

PDFs open fitted to the screen width. Use the 25–400% zoom slider, plus/minus buttons, or Fit width. Ctrl + scroll (Option + scroll on Mac) zooms the PDF; Ctrl/Option + plus/minus also works, with 0 returning to fit width. Zoom retains your current page position.

S: Select; T: Text; H: Highlight; N: Note; D: Draw; E: Erase. Shortcuts are inactive while typing in text boxes, notes, or inputs. Red, green, blue, and yellow presets accompany the custom color picker and apply to the last focused text annotation as well as new text.

## Essential editing shortcuts

Click an annotation to select it. Delete/Backspace removes it; arrows move it by 1 point (Shift: 10). Ctrl/Cmd+D duplicates; Ctrl/Cmd+C/X/V copies, cuts, and pastes annotations within this tab. Native text editing and copying selected PDF text retain their browser behavior. Press Escape once to leave text editing, and again to deselect. Ctrl/Cmd+Z undoes; Shift+Z or Y redoes. Ctrl/Cmd+S saves the project; Shift+S downloads the PDF. Ctrl/Cmd+O opens a PDF; Shift+O opens a project. ? or F1 opens the shortcut reference. Google Material Symbols are from Google Fonts, with a locally bundled icon subset for reliable loading.

Run `node --test tool/pdf-annotator/tests/keyboard.test.mjs` from the toolbox root to verify shortcut routing and protection of native editing.
