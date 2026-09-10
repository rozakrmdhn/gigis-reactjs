const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function measureExactPageNumbers(htmlPath) {
  return new Promise((resolve, reject) => {
    const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const proc = spawn(edge, [
      '--headless',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      `file:///${htmlPath.replace(/\\/g, '/')}`
    ]);

    setTimeout(() => {
      http.get('http://127.0.0.1:9222/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const targets = JSON.parse(data);
            const pageTarget = targets.find(t => t.type === 'page');
            if (!pageTarget) { proc.kill(); resolve({}); return; }

            const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
            ws.addEventListener('open', () => {
              const script = `
                new Promise(r => setTimeout(() => {
                  const pbs = Array.from(document.querySelectorAll('.page-break'));
                  const pbTops = pbs.map(el => Math.round(el.getBoundingClientRect().top + window.scrollY));
                  
                  // Printable page height inside a block (approx 930px)
                  const PRINT_HEIGHT = 930;
                  
                  const targets = Array.from(document.querySelectorAll('[id]'));
                  const pageMap = {};
                  
                  targets.forEach(el => {
                    const y = Math.round(el.getBoundingClientRect().top + window.scrollY);
                    
                    // Find which page-break block el belongs to
                    let pbIdx = 0;
                    for (let i = 0; i < pbTops.length; i++) {
                      if (y >= pbTops[i] - 15) {
                        pbIdx = i;
                      }
                    }
                    
                    const blockStart = pbTops[pbIdx] || 0;
                    const distInBlock = Math.max(0, y - blockStart);
                    const pagesInBlock = Math.floor(distInBlock / PRINT_HEIGHT);
                    
                    // Total page = 1 (cover) + pbIdx + pagesInBlock
                    const pageNum = 1 + pbIdx + pagesInBlock;
                    pageMap[el.id] = pageNum;
                  });
                  
                  r(pageMap);
                }, 1000))
              `;
              ws.send(JSON.stringify({
                id: 1,
                method: 'Runtime.evaluate',
                params: { expression: script, awaitPromise: true, returnByValue: true }
              }));
            });

            ws.addEventListener('message', (event) => {
              try {
                const resData = JSON.parse(event.data);
                const pageMap = resData.result?.result?.value || {};
                ws.close();
                proc.kill();
                resolve(pageMap);
              } catch (e) {
                ws.close();
                proc.kill();
                resolve({});
              }
            });
          } catch (e) {
            proc.kill();
            resolve({});
          }
        });
      }).on('error', () => {
        proc.kill();
        resolve({});
      });
    }, 2000);
  });
}

(async () => {
  const map = await measureExactPageNumbers('C:\\Development\\gigis-reactjs\\PANDUAN_PENGGUNA.html');
  console.log('Measured Page Map:', JSON.stringify(map, null, 2));
})();
