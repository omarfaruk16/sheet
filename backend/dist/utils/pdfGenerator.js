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
                            const nameToPrint = item.headerLeftText || 'Customer Name';
                            const emailToPrint = item.headerRightText || 'Customer Email';
                            const specialMsg = item.coverPageText || "Prepared specifically for:";
                            const lines = specialMsg.split('\n');
                            let currY = boxY + boxHeight - 30;
                            for (const line of lines) {
                                page.drawText(line, { x: boxX + 20, y: currY, size: 14, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                                currY -= 16;
                            }
                            page.drawText(nameToPrint, { x: boxX + 20, y: boxY + boxHeight - 60, size: 16, font: regularFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                            page.drawText(emailToPrint, { x: boxX + 20, y: boxY + boxHeight - 80, size: 12, font: regularFont, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
                        }
                        // --- Task 2: Header on EVERY page ---
                        const hdrHeight = 58;
                        const hdrY = height - hdrHeight;
                        // page.drawRectangle({
                        //   x: 0, y: height - 35, width: width, height: 35,
                        //   color: rgb(1, 1, 1)
                        // });
                        // page.drawRectangle({
                        //   x: 0, y: hdrY, width: width, height: hdrHeight,
                        //   color: rgb(242/255, 242/255, 242/255)
                        // });
                        // page.drawLine({
                        //   start: { x: 0, y: hdrY },
                        //   end: { x: width, y: hdrY },
                        //   thickness: 0.5,
                        //   color: rgb(0, 0, 0)
                        // });
                        const headerNameStr = item.headerLeftText || 'Customer Name';
                        const headerEmailStr = item.headerRightText || 'customer@email.com';
                        const textY = hdrY + (hdrHeight - 9) / 2;
                        page.drawText(headerNameStr, { x: 8, y: textY, size: 15, font: boldFont, color: (0, pdf_lib_1.rgb)(30 / 255, 30 / 255, 30 / 255) });
                        try {
                            const emailWidth = regularFont.widthOfTextAtSize(headerEmailStr, 15);
                            page.drawText(headerEmailStr, { x: width - emailWidth - 8, y: textY, size: 15, font: regularFont, color: (0, pdf_lib_1.rgb)(30 / 255, 30 / 255, 30 / 255) });
                        }
                        catch (e) {
                            page.drawText(headerEmailStr, { x: width - 150, y: textY, size: 15, font: regularFont, color: (0, pdf_lib_1.rgb)(30 / 255, 30 / 255, 30 / 255) });
                        }
                        // --- Task 3: Diagonal Watermark ---
                        if (item.watermarkText) {
                            const watermarkStr = item.watermarkText;
                            try {
                                const wmWidth = boldFont.widthOfTextAtSize(watermarkStr, 52);
                                page.drawText(watermarkStr, {
                                    x: width / 2 - wmWidth / 2, y: height / 2, size: 72, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0), opacity: 0.3, rotate: (0, pdf_lib_1.degrees)(45)
                                });
                            }
                            catch (e) {
                                page.drawText(watermarkStr, {
                                    x: width / 4, y: height / 2, size: 72, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0), opacity: 0.3, rotate: (0, pdf_lib_1.degrees)(45)
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
