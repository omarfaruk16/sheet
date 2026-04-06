"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateModelTestPdf = exports.generateCustomPdf = void 0;
const pdf_lib_1 = require("pdf-lib");
const prisma_1 = require("../config/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
/**
 * Generates custom PDFs for a completed order
 * 1. Downloads chapters (or uses local paths if mocked)
 * 2. Injects cover page, header text, watermark
 * 3. Saves customized PDF locally in public/downloads folder (replaces Firebase Storage for local dev)
 */
const generateCustomPdf = async (orderId) => {
    try {
        console.log(`Starting PDF generation for order ${orderId}`);
        const rawOrder = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true, chaptersItem: true } } }
        });
        if (!rawOrder) {
            console.error(`Order ${orderId} not found`);
            return;
        }
        const order = {
            ...rawOrder,
            items: rawOrder.items.map((i) => ({ ...i, chapters: i.chaptersItem, productId: i.product }))
        };
        if (!order) {
            console.error(`Order ${orderId} not found`);
            return;
        }
        // Ensure downloads dir exists
        const downloadsDir = path_1.default.join(__dirname, '../../public/downloads', order.userId);
        if (!fs_1.default.existsSync(downloadsDir)) {
            fs_1.default.mkdirSync(downloadsDir, { recursive: true });
        }
        // Process each item
        for (const item of order.items) {
            for (const chapter of item.chapters) {
                try {
                    let doc;
                    if (chapter.pdfUrl && chapter.pdfUrl.startsWith('http')) {
                        const response = await axios_1.default.get(chapter.pdfUrl, { responseType: 'arraybuffer' });
                        doc = await pdf_lib_1.PDFDocument.load(response.data);
                    }
                    else if (chapter.pdfUrl && chapter.pdfUrl.startsWith('/uploads')) {
                        const localPath = path_1.default.join(process.cwd(), chapter.pdfUrl);
                        const fileData = fs_1.default.readFileSync(localPath);
                        doc = await pdf_lib_1.PDFDocument.load(fileData);
                    }
                    else {
                        console.warn(`Mocking missing PDF for chapter ${chapter.name}`);
                        doc = await pdf_lib_1.PDFDocument.create();
                        doc.addPage([595.28, 841.89]);
                        doc.getPages()[0].drawText(`Mock Content for ${chapter.name}`, { x: 50, y: 700, size: 24 });
                    }
                    const boldFont = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
                    const regularFont = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
                    const pages = doc.getPages();
                    for (let i = 0; i < pages.length; i++) {
                        const page = pages[i];
                        const { width, height } = page.getSize();
                        // --- Task 1: Front Page Modification ---
                        if (i === 0) {
                            const boxWidth = 400;
                            const boxHeight = 100;
                            const boxX = width / 2 - boxWidth / 2;
                            const boxY = 200; // 30pt from bottom
                            page.drawRectangle({
                                x: boxX - 10, y: boxY - 10, width: boxWidth + 20, height: boxHeight + 20,
                                color: (0, pdf_lib_1.rgb)(1, 1, 1)
                            });
                            page.drawRectangle({
                                x: boxX, y: boxY, width: boxWidth, height: boxHeight,
                                borderColor: (0, pdf_lib_1.rgb)(0, 0, 0),
                                borderWidth: 1.5,
                                color: (0, pdf_lib_1.rgb)(1, 1, 1)
                            });
                            const specialMsg = item.coverPageText || "";
                            const lines = specialMsg.split('\n');
                            let currY = boxY + boxHeight - 30;
                            for (const line of lines) {
                                page.drawText(line, { x: boxX + 20, y: currY, size: 18, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                                currY -= 16;
                            }
                        }
                        // --- Task 2: Header on EVERY page ---
                        const headerFontSize = 11;
                        const textY = height - headerFontSize - 4;
                        const headerBgHeight = headerFontSize + 8;
                        const headerNameStr = item.headerLeftText || '';
                        const headerEmailStr = item.headerRightText || '';
                        // 1. Draw white background to cover any existing content at the top
                        page.drawRectangle({
                            x: 0,
                            y: height - headerBgHeight,
                            width: width,
                            height: headerBgHeight,
                            color: (0, pdf_lib_1.rgb)(1, 1, 1), // white
                        });
                        // 2. Draw left text
                        page.drawText(headerNameStr, {
                            x: 30,
                            y: textY,
                            size: headerFontSize,
                            font: boldFont,
                            color: (0, pdf_lib_1.rgb)(0, 0, 0),
                        });
                        // 3. Draw right text
                        try {
                            const rightTextWidth = boldFont.widthOfTextAtSize(headerEmailStr, headerFontSize);
                            page.drawText(headerEmailStr, {
                                x: width - rightTextWidth - 30,
                                y: textY,
                                size: headerFontSize,
                                font: boldFont,
                                color: (0, pdf_lib_1.rgb)(0, 0, 0),
                            });
                        }
                        catch (e) {
                            page.drawText(headerEmailStr, {
                                x: width - 120,
                                y: textY,
                                size: headerFontSize,
                                font: boldFont,
                                color: (0, pdf_lib_1.rgb)(0, 0, 0),
                            });
                        }
                        // --- Task 3: Diagonal Watermark ---
                        if (item.watermarkText) {
                            const watermarkStr = item.watermarkText;
                            const wmFontSize = 52;
                            try {
                                const wmWidth = boldFont.widthOfTextAtSize(watermarkStr, wmFontSize);
                                const wmHeight = wmFontSize; // approximate glyph height
                                // To rotate around the page center, offset by half the text dimensions
                                const centerX = width / 2;
                                const centerY = height / 2;
                                // pdf-lib rotates around the text's bottom-left corner,
                                // so we shift by half the text width/height to truly center it
                                const angleRad = (45 * Math.PI) / 180;
                                const offsetX = (wmWidth / 2) * Math.cos(angleRad) - (wmHeight / 2) * Math.sin(angleRad);
                                const offsetY = (wmWidth / 2) * Math.sin(angleRad) + (wmHeight / 2) * Math.cos(angleRad);
                                page.drawText(watermarkStr, {
                                    x: centerX - offsetX,
                                    y: centerY - offsetY,
                                    size: wmFontSize,
                                    font: boldFont,
                                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                                    opacity: 0.3,
                                    rotate: (0, pdf_lib_1.degrees)(45),
                                });
                            }
                            catch (e) {
                                // fallback
                                page.drawText(watermarkStr, {
                                    x: width / 4,
                                    y: height / 2,
                                    size: wmFontSize,
                                    font: boldFont,
                                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                                    opacity: 0.15,
                                    rotate: (0, pdf_lib_1.degrees)(45),
                                });
                            }
                        }
                    }
                    // Save locally
                    const pdfBytes = await doc.save();
                    // Fix object identification
                    const pid = item.product?.id || item.productId?.id || item.productId || 'UNKNOWN';
                    const safeName = chapter.name.replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `${pid}_${safeName}_${Date.now()}.pdf`;
                    const filePath = path_1.default.join(downloadsDir, fileName);
                    fs_1.default.writeFileSync(filePath, pdfBytes);
                    console.log(`Successfully generated individual chapter PDF at ${filePath}`);
                    const targetUrl = `/downloads/${order.userId}/${fileName}`;
                    // Update the specific OrderChapter with the new customized URL
                    await prisma_1.prisma.orderChapter.update({
                        where: { id: chapter.id },
                        data: { pdfUrl: targetUrl }
                    });
                    // Also set the entire item's download URL as fallback if needed
                    await prisma_1.prisma.orderItem.update({
                        where: { id: item.id },
                        data: { downloadUrl: targetUrl }
                    });
                }
                catch (error) {
                    console.error(`Error customizing chapter ${chapter.name}:`, error);
                }
            }
        }
        console.log(`Finished PDF generation for order ${orderId}`);
    }
    catch (error) {
        console.error(`Failed to generate custom PDF for order ${orderId}:`, error);
    }
};
exports.generateCustomPdf = generateCustomPdf;
/**
 * Generates watermarked solutions PDFs for a completed model test order.
 * - Downloads the solutionPdfUrl, applies watermark, saves locally.
 * - Sets questionsDownloadUrl directly from the stored questionsDocxUrl.
 */
const generateModelTestPdf = async (orderId) => {
    try {
        console.log(`Starting Model Test PDF generation for order ${orderId}`);
        const rawOrder = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        modelTestOrderItems: true,
                    }
                }
            }
        });
        if (!rawOrder) {
            console.error(`Order ${orderId} not found`);
            return;
        }
        const downloadsDir = path_1.default.join(__dirname, '../../public/downloads', rawOrder.userId);
        if (!fs_1.default.existsSync(downloadsDir))
            fs_1.default.mkdirSync(downloadsDir, { recursive: true });
        for (const item of rawOrder.items) {
            const mtItems = item.modelTestOrderItems || [];
            if (!mtItems.length)
                continue;
            for (const mtItem of mtItems) {
                try {
                    // ── 1. Set questionsDownloadUrl directly (no transformation needed) ──
                    let questionsUrl = null;
                    if (mtItem.questionsDocxUrl) {
                        if (mtItem.questionsDocxUrl.startsWith('http')) {
                            questionsUrl = mtItem.questionsDocxUrl;
                        }
                        else {
                            // Local path — serve as-is via static middleware
                            questionsUrl = mtItem.questionsDocxUrl.startsWith('/')
                                ? mtItem.questionsDocxUrl
                                : `/${mtItem.questionsDocxUrl}`;
                        }
                    }
                    // ── 2. Load solutions PDF and apply watermark ─────────────────────
                    let doc;
                    if (mtItem.solutionPdfUrl && mtItem.solutionPdfUrl.startsWith('http')) {
                        const response = await axios_1.default.get(mtItem.solutionPdfUrl, { responseType: 'arraybuffer' });
                        doc = await pdf_lib_1.PDFDocument.load(response.data);
                    }
                    else if (mtItem.solutionPdfUrl && (mtItem.solutionPdfUrl.startsWith('/uploads') || mtItem.solutionPdfUrl.includes('uploads'))) {
                        const localPath = path_1.default.join(process.cwd(), mtItem.solutionPdfUrl.startsWith('/') ? mtItem.solutionPdfUrl.slice(1) : mtItem.solutionPdfUrl);
                        const fileData = fs_1.default.readFileSync(localPath);
                        doc = await pdf_lib_1.PDFDocument.load(fileData);
                    }
                    else {
                        console.warn(`Missing solutionPdfUrl for model test item ${mtItem.name}, creating mock`);
                        doc = await pdf_lib_1.PDFDocument.create();
                        doc.addPage([595.28, 841.89]);
                        doc.getPages()[0].drawText(`Solutions: ${mtItem.name}`, { x: 50, y: 700, size: 24 });
                    }
                    // Apply watermark to every page if set
                    if (item.watermarkText) {
                        const boldFont = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
                        const watermarkStr = item.watermarkText;
                        const wmFontSize = 52;
                        for (const page of doc.getPages()) {
                            const { width, height } = page.getSize();
                            try {
                                const wmWidth = boldFont.widthOfTextAtSize(watermarkStr, wmFontSize);
                                const wmHeight = wmFontSize;
                                const centerX = width / 2;
                                const centerY = height / 2;
                                const angleRad = (45 * Math.PI) / 180;
                                const offsetX = (wmWidth / 2) * Math.cos(angleRad) - (wmHeight / 2) * Math.sin(angleRad);
                                const offsetY = (wmWidth / 2) * Math.sin(angleRad) + (wmHeight / 2) * Math.cos(angleRad);
                                page.drawText(watermarkStr, {
                                    x: centerX - offsetX,
                                    y: centerY - offsetY,
                                    size: wmFontSize,
                                    font: boldFont,
                                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                                    opacity: 0.3,
                                    rotate: (0, pdf_lib_1.degrees)(45),
                                });
                            }
                            catch (e) {
                                page.drawText(watermarkStr, {
                                    x: width / 4, y: height / 2,
                                    size: wmFontSize, font: boldFont,
                                    color: (0, pdf_lib_1.rgb)(0, 0, 0), opacity: 0.15, rotate: (0, pdf_lib_1.degrees)(45),
                                });
                            }
                        }
                    }
                    const pdfBytes = await doc.save();
                    const safeName = mtItem.name.replace(/[^a-zA-Z0-9]/g, '_');
                    const solutionsFileName = `MT_SOL_${safeName}_${Date.now()}.pdf`;
                    const solutionsFilePath = path_1.default.join(downloadsDir, solutionsFileName);
                    fs_1.default.writeFileSync(solutionsFilePath, pdfBytes);
                    const solutionsDownloadUrl = `/downloads/${rawOrder.userId}/${solutionsFileName}`;
                    // ── 3. Persist both URLs ──────────────────────────────────────────
                    await prisma_1.prisma.orderModelTestItem.update({
                        where: { id: mtItem.id },
                        data: {
                            questionsDownloadUrl: questionsUrl,
                            solutionsDownloadUrl,
                        }
                    });
                    console.log(`Generated solutions PDF for MT item: ${mtItem.name}`);
                }
                catch (err) {
                    console.error(`Error processing MT item ${mtItem.name}:`, err);
                }
            }
        }
        console.log(`Finished Model Test PDF generation for order ${orderId}`);
    }
    catch (error) {
        console.error(`Failed to generate model test PDF for order ${orderId}:`, error);
    }
};
exports.generateModelTestPdf = generateModelTestPdf;
