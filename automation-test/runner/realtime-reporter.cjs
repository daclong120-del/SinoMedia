const path = require('path');

class RealtimeReporter {
  onBegin(config, suite) {
    // Lọc bỏ setup tests ra khỏi tổng số test cases
    const tests = suite.allTests().filter(t => {
      const file = (t.location ? t.location.file || '' : '').replace(/\\/g, '/');
      return !file.includes('/_setup/') && !file.endsWith('.setup.ts');
    });
    console.log(`__PW_EVENT__${JSON.stringify({ type: 'run-begin', total: tests.length })}`);
  }

  onTestBegin(test) {
    const file = (test.location ? test.location.file || '' : '').replace(/\\/g, '/');
    if (file.includes('/_setup/') || file.endsWith('.setup.ts')) {
      return; // Bỏ qua setup test
    }

    const idMatch = test.title.match(/TC_[A-Z0-9_]+/i);
    const testCaseId = idMatch ? idMatch[0] : 'N/A';

    // Xác định tên module dựa trên thư mục chứa file test
    let moduleName = 'General';
    if (test.location && test.location.file) {
      const relativePath = path.relative(path.resolve(__dirname, '..'), test.location.file);
      const parts = relativePath.split(path.sep);
      if (parts.length > 1 && parts[0] === 'tests') {
        const dirName = parts[1];
        if (dirName !== '_setup') {
          moduleName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        }
      }
    }

    // Tự động phân loại loại test
    let type = 'UI';
    if (test.title.toLowerCase().includes('backend') || test.title.toLowerCase().includes('service')) {
      type = 'Backend';
    } else if (test.title.toLowerCase().includes('api')) {
      type = 'API';
    }

    console.log(`__PW_EVENT__${JSON.stringify({
      type: 'test-begin',
      pwTestId: test.id,
      id: testCaseId,
      title: test.title,
      module: moduleName,
      testType: type
    })}`);
  }

  onTestEnd(test, result) {
    const file = (test.location ? test.location.file || '' : '').replace(/\\/g, '/');
    if (file.includes('/_setup/') || file.endsWith('.setup.ts')) {
      return; // Bỏ qua setup test
    }

    const idMatch = test.title.match(/TC_[A-Z0-9_]+/i);
    const testCaseId = idMatch ? idMatch[0] : 'N/A';

    let errorMessage = '';
    if (result.errors && result.errors.length > 0) {
      errorMessage = result.errors.map(e => e.message || '').join('\n');
      errorMessage = errorMessage.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }

    console.log(`__PW_EVENT__${JSON.stringify({
      type: 'test-end',
      pwTestId: test.id,
      id: testCaseId,
      status: result.status,
      duration: result.duration,
      errorMessage: errorMessage
    })}`);
  }
}

module.exports = RealtimeReporter;
