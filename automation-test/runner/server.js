const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const url = require('url');
const { loadTestModules, findTestModule, buildPlaywrightArgsForModule } = require('../src/utils/ModuleRegistry');

const PORT = process.env.DASHBOARD_PORT || 3005;
const playwrightCli = require.resolve('@playwright/test/cli');
const nodeBin = process.execPath;

let activeTestProcess = null; // Quản lý tiến trình đang chạy

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
      const suiteFile = (suite.file || '').replace(/\\/g, '/');
      if (suiteFile.startsWith('_setup/') || suiteFile.includes('/_setup/')) {
        return;
      }

      let currentModule = moduleName;
      if (suite.title) {
        if (suite.title.endsWith('.spec.ts')) {
          currentModule = path.basename(suite.title, '.spec.ts')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          currentModule = suite.title.replace(/@\w+/g, '').trim();
        }
      }

      if (suite.specs) {
        suite.specs.forEach(spec => {
          spec.tests.forEach(testRun => {
            summary.total++;

            const idMatch = spec.title.match(/TC_[A-Z0-9_]+/i);
            const testCaseId = idMatch ? idMatch[0] : 'N/A';

            let title = spec.title;
            if (idMatch) {
              title = title.replace(idMatch[0], '').replace(/^\s*-\s*/, '').trim();
            }
            title = title.replace(/@\w+/g, '').trim();

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
              const res = testRun.results[testRun.results.length - 1];
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
                  errorMessage = res.errors.map(e => e.message || '').join('\n');
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

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

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

  // 2. API Lấy danh sách modules
  if (pathname === '/api/modules' && req.method === 'GET') {
    const modules = loadTestModules();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(modules));
    return;
  }

  // 3. API Chạy Test
  if (pathname === '/api/run' && req.method === 'POST') {
    if (activeTestProcess) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Đang có một tiến trình kiểm thử đang chạy!', running: true }));
      return;
    }

    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk;
    });

    req.on('end', () => {
      let params = {};
      try {
        if (bodyData) {
          params = JSON.parse(bodyData);
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON payload không hợp lệ' }));
        return;
      }

      const mode = params.mode || 'all';
      let args = [playwrightCli, 'test'];

      if (mode === 'type') {
        const type = params.type;
        if (type === 'ui') {
          args.push('--grep', '@ui');
        } else if (type === 'backend') {
          args.push('--grep', '@backend');
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Type không hợp lệ. Phải là "ui" hoặc "backend"' }));
          return;
        }
      } else if (mode === 'module') {
        const moduleId = params.moduleId;
        const mod = findTestModule(moduleId);
        if (!mod) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Không tìm thấy module: ${moduleId}` }));
          return;
        }
        args.push(...buildPlaywrightArgsForModule(moduleId));
      } else if (mode !== 'all') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Mode không hợp lệ. Phải là "all", "type", hoặc "module"' }));
        return;
      }

      // Luôn chạy tuần tự --workers=1 ở local để tránh quá tải
      args.push('--workers=1');

      const resultsPath = path.resolve(__dirname, '../reports/results.json');
      fs.rmSync(resultsPath, { force: true });

      console.log(`Bắt đầu chạy câu lệnh kiểm thử: ${nodeBin} ${args.join(' ')}`);

      let consoleOutput = '';

      activeTestProcess = spawn(nodeBin, args, {
        cwd: path.resolve(__dirname, '..')
      });

      activeTestProcess.stdout.on('data', data => {
        consoleOutput += data.toString();
      });

      activeTestProcess.stderr.on('data', data => {
        consoleOutput += data.toString();
      });

      activeTestProcess.on('close', code => {
        console.log(`Lệnh test hoàn tất với exit code: ${code}`);
        activeTestProcess = null;

        const results = parsePlaywrightResults(resultsPath);
        results.consoleOutput = consoleOutput;
        results.exitCode = code;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      });

      activeTestProcess.on('error', err => {
        console.error('Lỗi khi spawn tiến trình test:', err);
        activeTestProcess = null;
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Không thể khởi chạy tiến trình test', details: err.message }));
      });
    });
    return;
  }

  // 4. API Đọc kết quả test hiện tại
  if (pathname === '/api/results' && req.method === 'GET') {
    const resultsPath = path.resolve(__dirname, '../reports/results.json');
    const results = parsePlaywrightResults(resultsPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // 5. Phục vụ Playwright HTML Report tĩnh (tại route /report/)
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

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Không tìm thấy API hoặc tệp tin tương ứng!');
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Dashboard Runner Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
