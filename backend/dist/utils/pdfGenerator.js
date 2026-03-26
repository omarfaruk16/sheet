"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomPdf = void 0;
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
            const pdfDocs = [];
            for (const chapter of item.chapters) {
                try {
                    // Note: In local testing, chapter.pdfUrl might be a dummy string.
                    // We'll create a blank PDF if we can't fetch it.
                    let doc;
                    try {
                        if (chapter.pdfUrl && chapter.pdfUrl.startsWith('http')) {
                            const response = await axios_1.default.get(chapter.pdfUrl, { responseType: 'arraybuffer' });
                            doc = await pdf_lib_1.PDFDocument.load(response.data);
                        }
                        else if (chapter.pdfUrl && chapter.pdfUrl.startsWith('/uploads')) {
                            // Read physically uploaded local PDFs directly from the file system
                            const localPath = path_1.default.join(process.cwd(), chapter.pdfUrl);
                            const fileData = fs_1.default.readFileSync(localPath);
                            doc = await pdf_lib_1.PDFDocument.load(fileData);
                        }
                        else {
                            throw new Error('No valid URL');
                        }
                    }
                    catch (e) {
                        console.error(`Mocking PDF due to fetch/file error for ${chapter.pdfUrl}:`, e);
                        // Mock empty PDF for testing
                        doc = await pdf_lib_1.PDFDocument.create();
                        doc.addPage([595.28, 841.89]); // A4
                        doc.getPages()[0].drawText(`Mock Content for ${chapter.name}`, { x: 50, y: 700, size: 24 });
                    }
                    pdfDocs.push(doc);
                }
                catch (error) {
                    console.error(`Error processing chapter ${chapter.name}:`, error);
                }
            }
            if (pdfDocs.length === 0)
                continue;
            // Merge
            const mergedPdf = await pdf_lib_1.PDFDocument.create();
            for (const doc of pdfDocs) {
                const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            // Add Cover Page
            if (item.coverPageText) {
                const coverPage = mergedPdf.insertPage(0);
                const { width, height } = coverPage.getSize();
                coverPage.drawText(item.coverPageText, {
                    x: 50,
                    y: height - 100,
                    size: 24,
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
            }
            // Add Header & Watermark
            const pages = mergedPdf.getPages();
            for (const page of pages) {
                const { width, height } = page.getSize();
                if (item.headerLeftText)
                    page.drawText(item.headerLeftText, { x: 50, y: height - 30, size: 10, color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5) });
                if (item.headerRightText)
                    page.drawText(item.headerRightText, { x: width - 100, y: height - 30, size: 10, color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5) });
                if (item.watermarkText) {
                    page.drawText(item.watermarkText, {
                        x: width / 2 - 100,
                        y: height / 2,
                        size: 40,
                        color: (0, pdf_lib_1.rgb)(0.9, 0.9, 0.9),
                        rotate: (0, pdf_lib_1.degrees)(45),
                        opacity: 0.3
                    });
                }
            }
            // Save locally
            const pdfBytes = await mergedPdf.save();
            const productIdStr = item.productId && item.productId._id
                ? item.productId._id.toString()
                : item.productId.toString();
            const fileName = `${productIdStr}_${Date.now()}.pdf`;
            const filePath = path_1.default.join(downloadsDir, fileName);
            fs_1.default.writeFileSync(filePath, pdfBytes);
            console.log(`Successfully generated and saved PDF at ${filePath}`);
            // We store the url on the order item directly via atomic update
            const targetUrl = `/downloads/${order.userId}/${fileName}`;
            item.downloadUrl = targetUrl; // update locally for reference if needed
            await prisma_1.prisma.orderItem.update({
                where: { id: item.id },
                data: { downloadUrl: targetUrl }
            });
        }
        console.log(`Finished PDF generation for order ${orderId}`);
    }
    catch (error) {
        console.error(`Failed to generate custom PDF for order ${orderId}:`, error);
    }
};
exports.generateCustomPdf = generateCustomPdf;
