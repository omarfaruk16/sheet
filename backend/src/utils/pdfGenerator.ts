import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { prisma } from '../config/prisma';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Generates custom PDFs for a completed order
 * 1. Downloads chapters (or uses local paths if mocked)
 * 2. Injects cover page, header text, watermark
 * 3. Saves customized PDF locally in public/downloads folder (replaces Firebase Storage for local dev)
 */
export const generateCustomPdf = async (orderId: string) => {
  try {
    console.log(`Starting PDF generation for order ${orderId}`);
    const rawOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, chaptersItem: true } } }
    });
    if (!rawOrder) {
      console.error(`Order ${orderId} not found`);
      return;
    }
    const order = {
      ...rawOrder,
      items: rawOrder.items.map((i: any) => ({ ...i, chapters: i.chaptersItem, productId: i.product }))
    };
    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    // Ensure downloads dir exists
    const downloadsDir = path.join(__dirname, '../../public/downloads', order.userId);
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Process each item
    for (const item of order.items as any) {

      for (const chapter of item.chapters) {
        try {
          let doc;
          if (chapter.pdfUrl && chapter.pdfUrl.startsWith('http')) {
            const response = await axios.get(chapter.pdfUrl, { responseType: 'arraybuffer' });
            doc = await PDFDocument.load(response.data);
          } else if (chapter.pdfUrl && chapter.pdfUrl.startsWith('/uploads')) {
            const localPath = path.join(process.cwd(), chapter.pdfUrl);
            const fileData = fs.readFileSync(localPath);
            doc = await PDFDocument.load(fileData);
          } else {
            console.warn(`Mocking missing PDF for chapter ${chapter.name}`);
            doc = await PDFDocument.create();
            doc.addPage([595.28, 841.89]);
            doc.getPages()[0].drawText(`Mock Content for ${chapter.name}`, { x: 50, y: 700, size: 24 });
          }

          const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
          const regularFont = await doc.embedFont(StandardFonts.Helvetica);
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
                color: rgb(1, 1, 1)
              });

              page.drawRectangle({
                x: boxX, y: boxY, width: boxWidth, height: boxHeight,
                borderColor: rgb(0, 0, 0),
                borderWidth: 1.5,
                color: rgb(1, 1, 1)
              });

              const nameToPrint = item.headerLeftText || '';
              const emailToPrint = item.headerRightText || '';
              const specialMsg = item.coverPageText || "";

              const lines = specialMsg.split('\n');
              let currY = boxY + boxHeight - 30;
              for (const line of lines) {
                page.drawText(line, { x: boxX + 20, y: currY, size: 14, font: boldFont, color: rgb(0, 0, 0) });
                currY -= 16;
              }

              page.drawText(nameToPrint, { x: boxX + 20, y: boxY + boxHeight - 60, size: 16, font: regularFont, color: rgb(0, 0, 0) });
              page.drawText(emailToPrint, { x: boxX + 20, y: boxY + boxHeight - 80, size: 12, font: regularFont, color: rgb(0.2, 0.2, 0.2) });
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
              color: rgb(1, 1, 1), // white
            });

            // 2. Draw left text
            page.drawText(headerNameStr, {
              x: 30,
              y: textY,
              size: headerFontSize,
              font: boldFont,
              color: rgb(0, 0, 0),
            });

            // 3. Draw right text
            try {
              const rightTextWidth = boldFont.widthOfTextAtSize(headerEmailStr, headerFontSize);
              page.drawText(headerEmailStr, {
                x: width - rightTextWidth - 30,
                y: textY,
                size: headerFontSize,
                font: boldFont,
                color: rgb(0, 0, 0),
              });
            } catch (e) {
              page.drawText(headerEmailStr, {
                x: width - 120,
                y: textY,
                size: headerFontSize,
                font: boldFont,
                color: rgb(0, 0, 0),
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
                  color: rgb(0, 0, 0),
                  opacity: 0.3,
                  rotate: degrees(45),
                });
              } catch (e) {
                // fallback
                page.drawText(watermarkStr, {
                  x: width / 4,
                  y: height / 2,
                  size: wmFontSize,
                  font: boldFont,
                  color: rgb(0, 0, 0),
                  opacity: 0.15,
                  rotate: degrees(45),
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
          const filePath = path.join(downloadsDir, fileName);

          fs.writeFileSync(filePath, pdfBytes);
          console.log(`Successfully generated individual chapter PDF at ${filePath}`);

          const targetUrl = `/downloads/${order.userId}/${fileName}`;

          // Update the specific OrderChapter with the new customized URL
          await prisma.orderChapter.update({
            where: { id: chapter.id },
            data: { pdfUrl: targetUrl }
          });

          // Also set the entire item's download URL as fallback if needed
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { downloadUrl: targetUrl }
          });

        } catch (error) {
          console.error(`Error customizing chapter ${chapter.name}:`, error);
        }
      }
    }

    console.log(`Finished PDF generation for order ${orderId}`);
  } catch (error: any) {
    console.error(`Failed to generate custom PDF for order ${orderId}:`, error);
  }
};

/**
 * Generates watermarked solutions PDFs for a completed model test order.
 * - Downloads the solutionPdfUrl, applies watermark, saves locally.
 * - Sets questionsDownloadUrl directly from the stored questionsDocxUrl.
 */
export const generateModelTestPdf = async (orderId: string) => {
  try {
    console.log(`Starting Model Test PDF generation for order ${orderId}`);

    const rawOrder = await (prisma as any).order.findUnique({
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

    const downloadsDir = path.join(__dirname, '../../public/downloads', rawOrder.userId);
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

    for (const item of rawOrder.items as any) {
      const mtItems = item.modelTestOrderItems || [];
      if (!mtItems.length) continue;

      for (const mtItem of mtItems) {
        try {
          // ── 1. Set questionsDownloadUrl directly (no transformation needed) ──
          let questionsUrl: string | null = null;
          if (mtItem.questionsDocxUrl) {
            if (mtItem.questionsDocxUrl.startsWith('http')) {
              questionsUrl = mtItem.questionsDocxUrl;
            } else {
              // Local path — serve as-is via static middleware
              questionsUrl = mtItem.questionsDocxUrl.startsWith('/')
                ? mtItem.questionsDocxUrl
                : `/${mtItem.questionsDocxUrl}`;
            }
          }

          // ── 2. Load solutions PDF and apply watermark ─────────────────────
          let doc;
          if (mtItem.solutionPdfUrl && mtItem.solutionPdfUrl.startsWith('http')) {
            const response = await axios.get(mtItem.solutionPdfUrl, { responseType: 'arraybuffer' });
            doc = await PDFDocument.load(response.data);
          } else if (mtItem.solutionPdfUrl && (mtItem.solutionPdfUrl.startsWith('/uploads') || mtItem.solutionPdfUrl.includes('uploads'))) {
            const localPath = path.join(process.cwd(), mtItem.solutionPdfUrl.startsWith('/') ? mtItem.solutionPdfUrl.slice(1) : mtItem.solutionPdfUrl);
            const fileData = fs.readFileSync(localPath);
            doc = await PDFDocument.load(fileData);
          } else {
            console.warn(`Missing solutionPdfUrl for model test item ${mtItem.name}, creating mock`);
            doc = await PDFDocument.create();
            doc.addPage([595.28, 841.89]);
            doc.getPages()[0].drawText(`Solutions: ${mtItem.name}`, { x: 50, y: 700, size: 24 });
          }

          // Apply watermark to every page if set
          if (item.watermarkText) {
            const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
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
                  color: rgb(0, 0, 0),
                  opacity: 0.3,
                  rotate: degrees(45),
                });
              } catch (e) {
                page.drawText(watermarkStr, {
                  x: width / 4, y: height / 2,
                  size: wmFontSize, font: boldFont,
                  color: rgb(0, 0, 0), opacity: 0.15, rotate: degrees(45),
                });
              }
            }
          }

          const pdfBytes = await doc.save();
          const safeName = mtItem.name.replace(/[^a-zA-Z0-9]/g, '_');
          const solutionsFileName = `MT_SOL_${safeName}_${Date.now()}.pdf`;
          const solutionsFilePath = path.join(downloadsDir, solutionsFileName);
          fs.writeFileSync(solutionsFilePath, pdfBytes);

          const solutionsDownloadUrl = `/downloads/${rawOrder.userId}/${solutionsFileName}`;

          // ── 3. Persist both URLs ──────────────────────────────────────────
          await (prisma as any).orderModelTestItem.update({
            where: { id: mtItem.id },
            data: {
              questionsDownloadUrl: questionsUrl,
              solutionsDownloadUrl,
            }
          });

          console.log(`Generated solutions PDF for MT item: ${mtItem.name}`);
        } catch (err) {
          console.error(`Error processing MT item ${mtItem.name}:`, err);
        }
      }
    }

    console.log(`Finished Model Test PDF generation for order ${orderId}`);
  } catch (error: any) {
    console.error(`Failed to generate model test PDF for order ${orderId}:`, error);
  }
};

