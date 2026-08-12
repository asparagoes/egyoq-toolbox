document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    
    // Buttons
    const splitBtn = document.getElementById("splitBtn");
    const resetBtn = document.getElementById("resetBtn");
    
    // Settings
    const colsInput = document.getElementById("cols");
    const rowsInput = document.getElementById("rows");
    const downloadMode = document.getElementById("downloadMode");
    
    // Status Pills
    const fileTag = document.getElementById("fileTag");
    const typeTag = document.getElementById("typeTag");
    const gridTag = document.getElementById("gridTag");
    const statusMessage = document.getElementById("statusMessage");

    let currentFile = null;

    // --- UI Updates ---
    function updateGridTag() {
        let displayCols = parseInt(colsInput.value, 10);
        let displayRows = parseInt(rowsInput.value, 10);
        
        // Prevent showing NaN if the input is empty
        if (isNaN(displayCols)) displayCols = 0;
        if (isNaN(displayRows)) displayRows = 0;
        
        gridTag.textContent = `${displayCols}x${displayRows} Grid`;
    }

    colsInput.addEventListener("input", updateGridTag);
    rowsInput.addEventListener("input", updateGridTag);

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length) {
            currentFile = e.target.files[0];
            fileNameDisplay.textContent = currentFile.name;
            
            // Update Pills
            fileTag.classList.add("active");
            fileTag.innerHTML = `<div class="dot"></div>File Loaded`;
            
            const ext = currentFile.name.split('.').pop().toUpperCase();
            typeTag.textContent = `${ext} Document`;
            
            splitBtn.disabled = false;
            statusMessage.classList.add("hidden");
        }
    });

    resetBtn.addEventListener("click", () => {
        currentFile = null;
        fileInput.value = "";
        fileNameDisplay.textContent = "No file chosen";
        fileTag.classList.remove("active");
        fileTag.innerHTML = `<div class="dot"></div>No file loaded`;
        typeTag.textContent = "Unknown type";
        splitBtn.disabled = true;
        statusMessage.classList.add("hidden");
    });

    // --- Processing Logic ---
    splitBtn.addEventListener("click", async () => {
        if (!currentFile) return;

        let cols = parseInt(colsInput.value, 10);
        let rows = parseInt(rowsInput.value, 10);
        const dMode = downloadMode.value;

        // SAFEGUARD: If user enters 0 or negative, treat it as 1 mathematically 
        // to prevent divide-by-zero crashes, keeping the file whole on that axis.
        if (cols <= 0 || isNaN(cols)) cols = 1;
        if (rows <= 0 || isNaN(rows)) rows = 1;

        splitBtn.disabled = true;
        splitBtn.innerHTML = "Processing...";
        showStatus("Analyzing and splitting file... this may take a moment depending on the size.");

        try {
            const ext = currentFile.name.split('.').pop().toLowerCase();
            const baseName = currentFile.name.replace(/\.[^/.]+$/, "");

            if (ext === "pdf") {
                await processPDF(currentFile, cols, rows, baseName, dMode);
            } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
                await processImage(currentFile, cols, rows, baseName, ext, dMode);
            } else {
                throw new Error("Unsupported format.");
            }
            
            showStatus("Success! Check your downloads folder.");
        } catch (error) {
            console.error(error);
            showStatus(`Error: ${error.message}`);
        } finally {
            splitBtn.disabled = false;
            splitBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg> Split & Download`;
        }
    });

    function showStatus(msg) {
        statusMessage.textContent = msg;
        statusMessage.classList.remove("hidden");
    }

    // --- Image Logic (Canvas) ---
    async function processImage(file, cols, rows, baseName, ext, dMode) {
        const imgURL = URL.createObjectURL(file);
        const img = new Image();
        img.src = imgURL;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const tileW = img.width / cols;
        const tileH = img.height / rows;
        const tiles = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const canvas = document.createElement("canvas");
                canvas.width = tileW;
                canvas.height = tileH;
                const ctx = canvas.getContext("2d");
                
                ctx.drawImage(img, col * tileW, row * tileH, tileW, tileH, 0, 0, tileW, tileH);
                const blob = await new Promise(res => canvas.toBlob(res, file.type, 1.0));
                tiles.push({ name: `${baseName}_r${row + 1}c${col + 1}.${ext}`, blob: blob });
            }
        }
        await triggerDownloads(tiles, baseName, cols, rows, dMode, "tiles.zip");
    }

    // --- PDF Logic (pdf-lib) ---
    async function processPDF(file, cols, rows, baseName, dMode) {
        const arrayBuffer = await file.arrayBuffer();
        const { PDFDocument } = PDFLib;
        const srcDoc = await PDFDocument.load(arrayBuffer);
        const pages = srcDoc.getPages();
        const tiles = [];

        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];
            const { width, height } = page.getSize();
            const tileW = width / cols;
            const tileH = height / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const outDoc = await PDFDocument.create();
                    const newPage = outDoc.addPage([tileW, tileH]);
                    
                    const embeddedPage = await outDoc.embedPage(page, {
                        left: c * tileW,
                        right: (c + 1) * tileW,
                        bottom: height - ((r + 1) * tileH),
                        top: height - (r * tileH)
                    });
                    
                    newPage.drawPage(embeddedPage, { x: 0, y: 0, width: tileW, height: tileH });
                    const pdfBytes = await outDoc.save();
                    const blob = new Blob([pdfBytes], { type: "application/pdf" });
                    
                    tiles.push({ name: `${baseName}_p${pageIndex + 1}_r${r + 1}c${c + 1}.pdf`, blob: blob });
                }
            }
        }
        await triggerDownloads(tiles, baseName, cols, rows, dMode, "split.zip");
    }

    // --- Download Handler ---
    async function triggerDownloads(tiles, baseName, cols, rows, dMode, zipSuffix) {
        if (dMode === "zip") {
            const zip = new JSZip();
            tiles.forEach(tile => zip.file(tile.name, tile.blob));
            const zipBlob = await zip.generateAsync({ type: "blob" });
            
            const url = URL.createObjectURL(zipBlob);
            forceDownload(url, `${baseName}_${cols}x${rows}_${zipSuffix}`);
        } else {
            for (let i = 0; i < tiles.length; i++) {
                const url = URL.createObjectURL(tiles[i].blob);
                forceDownload(url, tiles[i].name);
                await new Promise(r => setTimeout(r, 200)); 
            }
        }
    }

    function forceDownload(url, filename) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});