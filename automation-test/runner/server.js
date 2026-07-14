const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const url = require('url');

const PORT = process.env.DASHBOARD_PORT || 3005;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Hàm phân tích kết quả Playwright từ file JSON
function parsePlaywrightResults(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      testCases: []
    };
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(rawData);

    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: json.stats ? json.stats.duration || 0 : 0
    };

    const testCases = [];

    function processSuite(suite, moduleName = 'General') {
      let currentModule = moduleName;
      if (suite.title) {
        if (suite.title.endsWith('.spec.ts')) {
          currentModule = path.basename(suite.title, '.spec.ts')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          // Trích xuất tên module từ tag mô tả hoặc title
          currentModule = suite.title.replace(/@\w+/g, '').trim();
        }
      }

      if (suite.specs) {
        suite.specs.forEach(spec => {
          spec.tests.forEach(testRun => {
            summary.total++;

            // Lấy ID từ spec title
            const idMatch = spec.title.match(/TC_[A-Z0-9_]+/i);
            const testCaseId = idMatch ? idMatch[0] : 'N/A';

            // Xóa ID khỏi title
            let title = spec.title;
            if (idMatch) {
              title = title.replace(idMatch[0], '').replace(/^\s*-\s*/, '').trim();
            }

            // Xóa tags khỏi title hiển thị
            title = title.replace(/@\w+/g, '').trim();

            // Xác định Type (UI hoặc Backend hoặc Service)
            let type = 'UI';
            if (spec.title.toLowerCase().includes('backend') || spec.title.toLowerCase().includes('service')) {
              type = 'Backend';
            } else if (spec.title.toLowerCase().includes('api')) {
              type = 'API';
            }

            let status = 'skipped';
            let duration = 0;
            let errorMessage = '';

            if (testRun.results && testRun.results.length > 0) {
              const res = testRun.results[0];
              duration = res.duration || 0;
              if (res.status === 'passed') {
                status = 'passed';
                summary.passed++;
              } else if (res.status === 'skipped') {
                status = 'skipped';
                summary.skipped++;
              } else {
                status = 'failed';
                summary.failed++;
                if (res.errors && res.errors.length > 0) {
                  // Ghép các thông báo lỗi nếu có
                  errorMessage = res.errors.map(e => e.message || '').join('\n');
                  // Lọc ansi color codes
                  errorMessage = errorMessage.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                } else if (res.error) {
                  errorMessage = (res.error.message || '').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                }
              }
            } else {
              summary.skipped++;
            }

            testCases.push({
              testCaseId,
              module: currentModule,
              type,
              title,
              status,
              duration,
              errorMessage
            });
          });
        });
      }

      if (suite.suites) {
        suite.suites.forEach(subSuite => processSuite(subSuite, currentModule));
      }
    }

    if (json.suites) {
      json.suites.forEach(suite => processSuite(suite));
    }

    return { summary, testCases };
  } catch (error) {
    console.error('Lỗi khi phân tích file kết quả JSON:', error);
    return {
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      testCases: []
    };
  }
}

// Khởi tạo Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. Phục vụ Dashboard HTML (Trang chủ)
  if (pathname === '/' || pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Không thể đọc file giao diện dashboard!');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // 2. API Chạy Test
  if (pathname === '/api/run-test') {
    const type = parsedUrl.query.type || 'all';
    let cmd = 'npm run test:all';

    if (type === 'ui') {
      cmd = 'npm run test:ui';
    } else if (type === 'backend') {
      cmd = 'npm run test:backend';
    } else if (type === 'role') {
      cmd = 'npm run test:role';
    }

    console.log(`Bắt đầu chạy câu lệnh kiểm thử: ${cmd}`);

    // Thực thi lệnh kiểm thử Playwright
    // Sử dụng CWD là thư mục cha của runner (thư mục automation-test)
    const testProcess = exec(cmd, { cwd: path.resolve(__dirname, '..') }, (error, stdout, stderr) => {
      console.log(`Chạy lệnh test hoàn tất.`);
      
      // Đọc file kết quả JSON sau khi chạy xong
      const resultsPath = path.resolve(__dirname, '../reports/results.json');
      const results = parsePlaywrightResults(resultsPath);

      // Thêm log stdout/stderr nếu cần debug
      results.consoleOutput = stdout || stderr;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
    return;
  }

  // 3. API Đọc kết quả test hiện tại
  if (pathname === '/api/results') {
    const resultsPath = path.resolve(__dirname, '../reports/results.json');
    const results = parsePlaywrightResults(resultsPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // 4. Phục vụ Playwright HTML Report tĩnh (tại route /report/)
  if (pathname.startsWith('/report/') || pathname === '/report') {
    let relativePath = pathname.replace('/report', '');
    if (relativePath === '/' || relativePath === '') {
      relativePath = '/index.html';
    }

    const reportFile = path.resolve(__dirname, '../playwright-report', relativePath.substring(1));
    fs.readFile(reportFile, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Không tìm thấy tệp tin Playwright Report! Vui lòng bấm chạy test trước để sinh báo cáo.');
        return;
      }
      const ext = path.extname(reportFile).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  // 5. Mặc định 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Không tìm thấy API hoặc tệp tin tương ứng!');
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Dashboard Runner Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
