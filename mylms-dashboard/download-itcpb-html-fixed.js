const https = require('https');
const fs = require('fs');
const path = require('path');

const SECURITY_KEY = 'fa138f6f2aaf73b2f19660ba1cfa86c1';

// Load the complete book data
const database = JSON.parse(fs.readFileSync('ALL_BOOKS_COMPLETE.json', 'utf8'));

// Create download directory
const downloadDir = 'ITCPB_HTML_Downloads_FIXED';
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    // Add token to URL if not present
    let downloadUrl = url;
    if (!url.includes('token=') && !url.includes('wstoken=')) {
      const separator = url.includes('?') ? '&' : '?';
      downloadUrl = `${url}${separator}token=${SECURITY_KEY}`;
    }
    
    const file = fs.createWriteStream(filepath);
    
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        fs.unlink(filepath, () => {}); // Delete file if download failed
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadITCPBHtmlFiles() {
  console.log('='.repeat(80));
  console.log('DOWNLOADING HTML FILES FROM ITCPB COURSES (WITH AUTHENTICATION)');
  console.log('='.repeat(80) + '\n');

  // Find all ITCPB courses
  const itcpbCourses = database.courses.filter(c => 
    c.shortname.includes('ITCPB')
  );

  console.log(`Found ${itcpbCourses.length} ITCPB course(s):`);
  itcpbCourses.forEach(c => {
    console.log(`  - ${c.fullname} (${c.shortname})`);
  });
  console.log();

  // Get all books from ITCPB courses
  const itcpbBooks = database.books.filter(book => 
    itcpbCourses.some(course => course.id === book.courseId)
  );

  console.log(`Found ${itcpbBooks.length} books in ITCPB courses\n`);

  // Collect all HTML files
  let totalHtmlFiles = 0;
  const downloadList = [];

  itcpbBooks.forEach(book => {
    const htmlFiles = book.files.filter(f => 
      f.filename.toLowerCase().endsWith('.html') || f.filename.toLowerCase().endsWith('.htm')
    );
    
    if (htmlFiles.length > 0) {
      console.log(`Book: "${book.bookName}"`);
      console.log(`  Course: ${book.courseName}`);
      console.log(`  HTML files: ${htmlFiles.length}`);
      
      htmlFiles.forEach(file => {
        totalHtmlFiles++;
        downloadList.push({
          book: book,
          file: file
        });
      });
      console.log();
    }
  });

  console.log('='.repeat(80));
  console.log(`Total HTML files to download: ${totalHtmlFiles}\n`);

  // Create folder structure and download files
  let downloaded = 0;
  let failed = 0;

  for (const item of downloadList) {
    const book = item.book;
    const file = item.file;
    
    // Create folder structure: Course/Book/Chapter/
    const courseFolderName = book.courseShortName.replace(/[<>:"/\\|?*]/g, '-');
    const bookFolderName = book.bookName.replace(/[<>:"/\\|?*]/g, '-');
    const chapterFolder = file.filepath.replace(/^\//, '').replace(/\/$/, '');
    
    const folderPath = path.join(downloadDir, courseFolderName, bookFolderName, chapterFolder);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, file.filename);
    
    try {
      await downloadFile(file.fileurl, filePath);
      downloaded++;
      
      // Verify the file is not an error response
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('"errorcode":"missingparam"') || content.includes('"error"')) {
        console.log(`[${downloaded}/${totalHtmlFiles}] ⚠️  ${book.bookName} -> ${chapterFolder}/${file.filename} (may be error response)`);
      } else {
        console.log(`[${downloaded}/${totalHtmlFiles}] ✓ ${book.bookName} -> ${chapterFolder}/${file.filename}`);
      }
    } catch (error) {
      failed++;
      console.log(`[${downloaded + failed}/${totalHtmlFiles}] ✗ Failed: ${file.filename} - ${error.message}`);
    }
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log('\n' + '='.repeat(80));
  console.log('DOWNLOAD COMPLETE!');
  console.log('='.repeat(80));
  console.log(`Successfully downloaded: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${totalHtmlFiles}`);
  console.log(`\nFiles saved to: ${path.resolve(downloadDir)}`);
  console.log('='.repeat(80));

  // Create an index file
  createIndex(itcpbBooks, downloadDir);
}

function createIndex(books, downloadDir) {
  let index = `# ITCPB HTML Files Index (Authenticated)\n\n`;
  index += `**Downloaded:** ${new Date().toISOString()}\n\n`;
  index += `---\n\n`;

  books.forEach(book => {
    const htmlFiles = book.files.filter(f => 
      f.filename.toLowerCase().endsWith('.html') || f.filename.toLowerCase().endsWith('.htm')
    );
    
    if (htmlFiles.length > 0) {
      index += `## ${book.bookName}\n\n`;
      index += `**Course:** ${book.courseName}\n`;
      index += `**Chapters:** ${book.chapterCount}\n`;
      index += `**HTML Files:** ${htmlFiles.length}\n\n`;
      
      // Group by chapter
      const byChapter = {};
      htmlFiles.forEach(file => {
        const chapter = file.filepath.replace(/^\//, '').replace(/\/$/, '');
        if (!byChapter[chapter]) {
          byChapter[chapter] = [];
        }
        byChapter[chapter].push(file);
      });
      
      Object.entries(byChapter).forEach(([chapter, files]) => {
        index += `### Chapter: ${chapter}\n\n`;
        files.forEach(file => {
          const relativePath = path.join(
            book.courseShortName.replace(/[<>:"/\\|?*]/g, '-'),
            book.bookName.replace(/[<>:"/\\|?*]/g, '-'),
            chapter,
            file.filename
          );
          index += `- [${file.filename}](${relativePath})\n`;
        });
        index += `\n`;
      });
    }
  });

  fs.writeFileSync(path.join(downloadDir, 'INDEX.md'), index);
  console.log(`\n✓ Created index file: ${path.join(downloadDir, 'INDEX.md')}`);
}

downloadITCPBHtmlFiles().catch(console.error);
