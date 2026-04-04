const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/app/(admin)/admin/model-tests/new/page.tsx',
  'frontend/src/app/(admin)/admin/model-tests/edit/[id]/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Replace function name
    content = content.replace(/handleZipUpload/g, 'handleDocxUpload');
    
    // Replace ref arrays
    content = content.replace(/zipInputRefs/g, 'docxInputRefs');
    
    // Replace accept types that weren't caught
    content = content.replace(/accept="\.zip,application\/zip"/g, 'accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"');
    
    // Replace FormData append
    content = content.replace(/fd\.append\('zip', file\)/g, "fd.append('docx', file);");
    
    // Replace text messages
    content = content.replace(/ZIP uploaded/g, 'DOCX uploaded');
    content = content.replace(/ZIP upload failed/g, 'DOCX upload failed');
    content = content.replace(/questions ZIP/g, 'questions DOCX');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Fixed:', file);
  } else {
    console.log('Not found:', file);
  }
});

// Also fix backend/src/routes/modelTestRoutes.ts to expect "docx" field
const backendModelRoutes = path.join(__dirname, 'backend/src/routes/modelTestRoutes.ts');
if (fs.existsSync(backendModelRoutes)) {
  let beContent = fs.readFileSync(backendModelRoutes, 'utf8');
  beContent = beContent.replace(/docxUpload\.single\('zip'\)/g, "docxUpload.single('docx')");
  fs.writeFileSync(backendModelRoutes, beContent, 'utf8');
}
