const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const runScript = (scriptName) => {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Running ${scriptName} ===\n`);

    const scriptPath = path.join(__dirname, scriptName);
    const process = spawn('node', [scriptPath], { stdio: 'inherit' });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptName} exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
};

const generateReport = async () => {
  console.log('=== RUNNING ALL SYSTEM CHECKS ===\n');

  const scripts = [
    'audit-models.js',
    'audit-middleware.js',
    'audit-services.js',
    'audit-controllers.js',
    'audit-routes.js',
    'check-env.js',
    'check-api.js',
    'check-database.js',
    'check-security.js',
    'check-error-handling.js',
    'check-logging.js',
    'check-performance.js',
    'check-tests.js',
    'check-dependencies.js'
  ];

  const results = [];
  let overallStatus = 'PASSED';

  for (const script of scripts) {
    try {
      await runScript(script);
      results.push({ script, status: 'PASSED' });
    } catch (error) {
      console.error(`Error running ${script}:`, error.message);
      results.push({ script, status: 'FAILED', error: error.message });
      overallStatus = 'FAILED';
    }
  }

  // Generate HTML Report
  const reportPath = path.join(__dirname, '../audit-report.html');
  const reportContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Audit Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .status {
            padding: 10px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: center;
            font-weight: bold;
        }
        .status.passed {
            background-color: #d4edda;
            color: #155724;
        }
        .status.failed {
            background-color: #f8d7da;
            color: #721c24;
        }
        .script-result {
            margin: 10px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .script-result.passed {
            border-left: 5px solid #28a745;
        }
        .script-result.failed {
            border-left: 5px solid #dc3545;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            text-align: center;
            margin-top: 20px;
        }
        .summary {
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>System Audit Report</h1>
        
        <div class="status ${overallStatus.toLowerCase()}">
            Overall Status: ${overallStatus}
        </div>

        <div class="summary">
            <h2>Summary</h2>
            <p>Total Scripts: ${scripts.length}</p>
            <p>Passed: ${results.filter(r => r.status === 'PASSED').length}</p>
            <p>Failed: ${results.filter(r => r.status === 'FAILED').length}</p>
        </div>

        <h2>Detailed Results</h2>
        ${results.map(result => `
            <div class="script-result ${result.status.toLowerCase()}">
                <h3>${result.script}</h3>
                <p>Status: ${result.status}</p>
                ${result.error ? `<p>Error: ${result.error}</p>` : ''}
            </div>
        `).join('')}

        <div class="timestamp">
            Report generated on: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
  `;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`\nReport generated: ${reportPath}`);

  // Generate Summary
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Total Scripts: ${scripts.length}`);
  console.log(`Passed: ${results.filter(r => r.status === 'PASSED').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'FAILED').length}`);
  console.log(`Overall Status: ${overallStatus}`);

  if (overallStatus === 'FAILED') {
    console.log('\nFailed Scripts:');
    results
      .filter(r => r.status === 'FAILED')
      .forEach(r => console.log(`- ${r.script}: ${r.error}`));
  }
};

generateReport().catch(console.error);