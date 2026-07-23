const net = require('net');

// Разнообразная выборка 3-буквенных доменов (.ru)
const CANDIDATES_3L = [
  // Смысловые 3-буквенники
  'fix.ru', 'fox.ru', 'fly.ru', 'fit.ru', 'box.ru', 'bay.ru',
  'dev.ru', 'app.ru', 'hub.ru', 'pub.ru', 'lab.ru', 'job.ru',
  'kod.ru', 'mod.ru', 'nod.ru', 'pod.ru', 'web.ru', 'pro.ru',

  // Созвучные с Tilda / Tild
  'tld.ru', 'tli.ru', 'tlo.ru', 'tla.ru', 'tlu.ru',

  // Редкие 3-буквенные сочетания
  'fxi.ru', 'nxi.ru', 'bxi.ru', 'zxi.ru', 'kxi.ru', 'vxi.ru',
  'qwx.ru', 'xjz.ru', 'zqx.ru', 'qxz.ru', 'zvx.ru', 'xqv.ru'
];

function checkDomain(domain) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responseData = '';
    socket.setTimeout(2000);

    socket.connect(43, 'whois.tcinet.ru', () => {
      socket.write(`${domain}\r\n`);
    });

    socket.on('data', (chunk) => { responseData += chunk.toString(); });

    socket.on('end', () => {
      socket.destroy();
      const isNoEntries = responseData.includes('No entries found');
      if (isNoEntries) resolve({ domain, status: 'FREE' });
      else resolve({ domain, status: 'TAKEN' });
    });

    socket.on('error', () => { socket.destroy(); resolve({ domain, status: 'ERROR' }); });
    socket.on('timeout', () => { socket.destroy(); resolve({ domain, status: 'TIMEOUT' }); });
  });
}

async function runCheck() {
  console.log(`🔍 ПРОВЕРКА 3-БУКВЕННЫХ ДОМЕНОВ В ЗОНЕ .RU (${CANDIDATES_3L.length} шт)...`);
  const freeDomains = [];

  for (let i = 0; i < CANDIDATES_3L.length; i++) {
    const domain = CANDIDATES_3L[i];
    const res = await checkDomain(domain);
    
    if (res.status === 'FREE') {
      console.log(`[${i+1}/${CANDIDATES_3L.length}] ${domain.padEnd(10, ' ')} -> \x1b[32mСВОБОДЕН ✅\x1b[0m`);
      freeDomains.push(domain);
    } else {
      console.log(`[${i+1}/${CANDIDATES_3L.length}] ${domain.padEnd(10, ' ')} -> Занят ❌`);
    }
    
    await new Promise(r => setTimeout(r, 60));
  }

  console.log('\n======================================================');
  console.log(`🎉 РЕЗУЛЬТАТ ПРОВЕРКИ 3-БУКВЕННИКОВ: Найдено свободных: ${freeDomains.length}`);
  console.log('======================================================\n');
}

runCheck();
