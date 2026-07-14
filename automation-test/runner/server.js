const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const url = require('url');
const { loadTestModules, findTestModule, buildPlaywrightArgsForModule } = require('../src/utils/ModuleRegistry');

const PORT = process.env.DASHBOARD_PORT || 3005;
const playwrightCli = require.resolve('@playwright/test/cli');
const nodeBin = process.execPath;

// Quản lý các lượt chạy kiểm thử thời gian thực
const runs = new Map();
let activeRunId = null;

function createRunId() {
  const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).substring(2, 6);
  return `run_${dateStr}_${rand}`;
}

function emitRunEvent(run, type, payload) {
  const event = { type, data: payload, timestamp: new Date().toISOString() };
  run.events.push(event);

  if (run.events.length > 2000) {
    run.events.shift();
  }

  run.clients.forEach(client => {
    writeSse(client, type, payload);
  });
}

function writeSse(res, type, payload) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function cleanupOldRuns() {
  if (runs.size > 5) {
    const keys = Array.from(runs.keys());
    const oldestKey = keys[0];
    runs.delete(oldestKey);
  }
}

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

  // 3. API Khởi tạo lượt chạy kiểm thử (Bất đồng bộ)
  if (pathname === '/api/runs' && req.method === 'POST') {
    if (activeRunId) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Đang có một tiến trình kiểm thử khác đang chạy!', running: true }));
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
      let args = ['playwright', 'test'];

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
        if (mod.requiresAuth) {
          args.push('tests/_setup/auth.setup.ts');
        }
        args.push(...mod.specs);
      } else if (mode !== 'all') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Mode không hợp lệ. Phải là "all", "type", hoặc "module"' }));
        return;
      }

      // Luôn chạy tuần tự --workers=1 ở local để tránh quá tải
      args.push('--workers=1');

      const resultsPath = path.resolve(__dirname, '../reports/results.json');
      if (fs.existsSync(resultsPath)) {
        try {
          fs.unlinkSync(resultsPath);
        } catch (e) {
          console.warn('Không thể xóa reports/results.json cũ:', e);
        }
      }

      const runId = createRunId();
      const run = {
        id: runId,
        status: 'running',
        mode,
        startedAt: new Date().toISOString(),
        endedAt: null,
        command: `npx ${args.join(' ')}`,
        clients: new Set(),
        events: [],
        logs: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
        testCases: [],
        exitCode: null
      };

      runs.set(runId, run);
      activeRunId = runId;
      cleanupOldRuns();

      console.log(`Khởi chạy runId: ${runId} - Lệnh: ${run.command}`);

      const testProcess = spawn('npx', args, {
        cwd: path.resolve(__dirname, '..'),
        shell: true,
        env: {
          ...process.env,
          PW_REALTIME_REPORTER: '1'
        }
      });

      run.process = testProcess;

      emitRunEvent(run, 'run-started', {
        runId,
        command: run.command,
        startedAt: run.startedAt
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      const handleOutput = (streamType, chunk) => {
        if (streamType === 'stdout') {
          stdoutBuffer += chunk.toString();
          let lines = stdoutBuffer.split('\n');
          stdoutBuffer = lines.pop(); // giữ lại dòng chưa hoàn chỉnh
          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('__PW_EVENT__')) {
              try {
                const eventData = JSON.parse(cleanLine.substring(12));
                if (eventData.type === 'run-begin') {
                  run.summary.total = eventData.total;
                  emitRunEvent(run, 'run-begin', { total: eventData.total });
                } else if (eventData.type === 'test-begin') {
                  const tc = {
                    pwTestId: eventData.pwTestId,
                    testCaseId: eventData.id,
                    title: eventData.title.replace(/@\w+/g, '').trim(),
                    module: eventData.module,
                    type: eventData.testType || 'UI',
                    status: 'running',
                    duration: 0,
                    errorMessage: ''
                  };
                  run.testCases.push(tc);
                  emitRunEvent(run, 'test-begin', tc);
                } else if (eventData.type === 'test-end') {
                  const tc = run.testCases.find(t => t.pwTestId === eventData.pwTestId);
                  if (tc) {
                    tc.status = eventData.status === 'passed' ? 'passed' : eventData.status === 'skipped' ? 'skipped' : 'failed';
                    tc.duration = eventData.duration;
                    tc.errorMessage = eventData.errorMessage;
                  }

                  // Tạm thời tự đếm counters trên server
                  run.summary.passed = run.testCases.filter(t => t.status === 'passed').length;
                  run.summary.skipped = run.testCases.filter(t => t.status === 'skipped').length;
                  run.summary.failed = run.testCases.filter(t => t.status === 'failed' || t.status === 'timedOut').length;

                  emitRunEvent(run, 'test-end', {
                    pwTestId: eventData.pwTestId,
                    id: eventData.id,
                    status: eventData.status,
                    duration: eventData.duration,
                    errorMessage: eventData.errorMessage,
                    summary: run.summary
                  });
                }
              } catch (e) {
                console.error('Lỗi khi parse event JSON:', e);
              }
            } else {
              run.logs.push(line);
              if (run.logs.length > 2000) run.logs.shift();
              emitRunEvent(run, 'log', { stream: 'stdout', line });
            }
          }
        } else {
          stderrBuffer += chunk.toString();
          let lines = stderrBuffer.split('\n');
          stderrBuffer = lines.pop();
          for (const line of lines) {
            run.logs.push(line);
            if (run.logs.length > 2000) run.logs.shift();
            emitRunEvent(run, 'log', { stream: 'stderr', line });
          }
        }
      };

      testProcess.stdout.on('data', chunk => handleOutput('stdout', chunk));
      testProcess.stderr.on('data', chunk => handleOutput('stderr', chunk));

      testProcess.on('close', code => {
        // Xử lý nốt buffer dở dang
        if (stdoutBuffer.trim()) {
          emitRunEvent(run, 'log', { stream: 'stdout', line: stdoutBuffer });
        }
        if (stderrBuffer.trim()) {
          emitRunEvent(run, 'log', { stream: 'stderr', line: stderrBuffer });
        }

        console.log(`Lượt chạy ${runId} hoàn tất với exit code: ${code}`);
        run.status = code === 0 ? 'completed' : 'failed';
        run.endedAt = new Date().toISOString();
        run.exitCode = code;
        activeRunId = null;

        const results = parsePlaywrightResults(resultsPath);

        // Reconcile kết quả cuối cùng từ file reports/results.json của Playwright
        if (results && results.testCases && results.testCases.length > 0) {
          run.summary = results.summary;
          run.testCases = results.testCases;
        }

        emitRunEvent(run, 'result-final', {
          summary: run.summary,
          testCases: run.testCases
        });

        emitRunEvent(run, 'run-finished', {
          exitCode: code,
          summary: run.summary
        });

        // Kết thúc kết nối với tất cả các client
        run.clients.forEach(client => {
          client.end();
        });
        run.clients.clear();
      });

      testProcess.on('error', err => {
        console.error('Lỗi khi spawn tiến trình test:', err);
        activeRunId = null;
        run.status = 'error';
        run.endedAt = new Date().toISOString();
        emitRunEvent(run, 'run-error', { message: err.message });

        run.clients.forEach(client => {
          client.end();
        });
        run.clients.clear();
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        runId,
        status: run.status,
        mode: run.mode,
        startedAt: run.startedAt
      }));
    });
    return;
  }

  // 3.1 API Stream kết quả chạy kiểm thử (SSE)
  if (pathname.startsWith('/api/runs/') && pathname.endsWith('/events') && req.method === 'GET') {
    const parts = pathname.split('/');
    const runId = parts[3];
    const run = runs.get(runId);

    if (!run) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Không tìm thấy runId tương ứng!');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const keepAliveInterval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    run.clients.add(res);

    // Gửi lại lịch sử toàn bộ các sự kiện cũ bao gồm logs/test status theo đúng thứ tự
    if (run.events.length > 0) {
      run.events.forEach(evt => {
        writeSse(res, evt.type, evt.data);
      });
    }

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      run.clients.delete(res);
    });
    return;
  }

  // 3.2 API Lấy chi tiết snapshot lượt chạy
  if (pathname.startsWith('/api/runs/') && !pathname.endsWith('/events') && req.method === 'GET') {
    const parts = pathname.split('/');
    const runId = parts[3];
    const run = runs.get(runId);

    if (!run) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy runId tương ứng!' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      runId: run.id,
      status: run.status,
      mode: run.mode,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      summary: run.summary,
      testCases: run.testCases
    }));
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
