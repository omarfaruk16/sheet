import { PDFDocument, rgb, degrees } from 'pdf-lib';
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
      const pdfDocs = [];
      
      for (const chapter of item.chapters) {
        try {
          // Note: In local testing, chapter.pdfUrl might be a dummy string.
          // We'll create a blank PDF if we can't fetch it.
          let doc;
          try {
            if (chapter.pdfUrl && chapter.pdfUrl.startsWith('http')) {
              const response = await axios.get(chapter.pdfUrl, { responseType: 'arraybuffer' });
              doc = await PDFDocument.load(response.data);
            } else if (chapter.pdfUrl && chapter.pdfUrl.startsWith('/uploads')) {
              // Read physically uploaded local PDFs directly from the file system
              const localPath = path.join(process.cwd(), chapter.pdfUrl);
              const fileData = fs.readFileSync(localPath);
              doc = await PDFDocument.load(fileData);
            } else {
              throw new Error('No valid URL');
            }
          } catch(e) {
            console.error(`Mocking PDF due to fetch/file error for ${chapter.pdfUrl}:`, e);
            // Mock empty PDF for testing
            doc = await PDFDocument.create();
            doc.addPage([595.28, 841.89]); // A4
            doc.getPages()[0].drawText(`Mock Content for ${chapter.name}`, { x: 50, y: 700, size: 24 });
          }
          pdfDocs.push(doc);
        } catch (error) {
          console.error(`Error processing chapter ${chapter.name}:`, error);
        }
      }

      if (pdfDocs.length === 0) continue;

      // Merge
      const mergedPdf = await PDFDocument.create();
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
          color: rgb(0, 0, 0),
        });
      }

      // Add Header & Watermark
      const pages = mergedPdf.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        if (item.headerLeftText) page.drawText(item.headerLeftText, { x: 50, y: height - 30, size: 10, color: rgb(0.5, 0.5, 0.5) });
        if (item.headerRightText) page.drawText(item.headerRightText, { x: width - 100, y: height - 30, size: 10, color: rgb(0.5, 0.5, 0.5) });
        if (item.watermarkText) {
          page.drawText(item.watermarkText, {
            x: width / 2 - 100,
            y: height / 2,
            size: 40,
            color: rgb(0.9, 0.9, 0.9),
            rotate: degrees(45),
            opacity: 0.3
          });
        }
      }

      // Save locally
      const pdfBytes = await mergedPdf.save();
      const productIdStr = item.productId && (item.productId as any)._id 
        ? (item.productId as any)._id.toString() 
        : item.productId.toString();
      const fileName = `${productIdStr}_${Date.now()}.pdf`;
      const filePath = path.join(downloadsDir, fileName);
      
      fs.writeFileSync(filePath, pdfBytes);
      console.log(`Successfully generated and saved PDF at ${filePath}`);
      
      // We store the url on the order item directly via atomic update
      const targetUrl = `/downloads/${order.userId}/${fileName}`;
      item.downloadUrl = targetUrl; // update locally for reference if needed
      
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { downloadUrl: targetUrl }
      });
    }
    
    console.log(`Finished PDF generation for order ${orderId}`);
  } catch (error: any) {
    console.error(`Failed to generate custom PDF for order ${orderId}:`, error);
  }
};
