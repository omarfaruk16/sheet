const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'backend/src/routes/orderRoutes.ts',
  'backend/src/routes/modelTestRoutes.ts',
  'backend/src/routes/paymentRoutes.ts',
  'backend/src/utils/pdfGenerator.ts',
  'backend/prisma/schema.prisma',
  'frontend/src/app/(user)/model-tests/[id]/page.tsx',
  'frontend/src/app/(admin)/admin/model-tests/new/page.tsx',
  'frontend/src/app/(admin)/admin/model-tests/edit/[id]/page.tsx',
  'frontend/src/app/(user)/profile/downloads/page.tsx',
  'frontend/src/app/(user)/checkout/page.tsx' // missing from grep but good to check
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replacements
    content = content.replace(/questionsZipUrl/g, 'questionsDocxUrl');
    content = content.replace(/questionsDownloadUrl/g, 'questionsDownloadUrl'); // keep same
    content = content.replace(/upload-zip/g, 'upload-docx');
    content = content.replace(/zipStorage/g, 'docxStorage');
    content = content.replace(/zipUpload/g, 'docxUpload');
    content = content.replace(/Questions \(ZIP\)/g, 'Questions (DOCX)');
    content = content.replace(/Questions ZIP/g, 'Questions DOCX');
    content = content.replace(/MT-ZIP-/g, 'MT-DOCX-');
    content = content.replace(/FileArchive/g, 'FileText');
    content = content.replace(/Upload ZIP/g, 'Upload DOCX');
    content = content.replace(/\.zip,application\/zip,application\/x-zip-compressed/g, '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
