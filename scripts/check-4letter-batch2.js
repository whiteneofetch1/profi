const net = require('net');

const CANDIDATES = [
  'ziko.ru', 'zika.ru', 'ziki.ru',
  'biko.ru', 'bika.ru', 'biki.ru',
  'diko.ru', 'dika.ru', 'diki.ru',
  'viko.ru', 'vika.ru', 'viki.ru',
  'piko.ru', 'pika.ru', 'piki.ru',
  'riko.ru', 'rika.ru', 'riki.ru',
  'miko.ru', 'mika.ru', 'miki.ru',
  'siko.ru', 'sika.ru', 'siki.ru',
  'tiko.ru', 'tika.ru', 'tiki.ru',
  'niko.ru', 'nika.ru', 'niki.ru',
  'vizi.ru', 'vizo.ru', 'viza.ru',
  'rizi.ru', 'rizo.ru', 'riza.ru',
  'mizi.ru', 'mizo.ru', 'miza.ru',
  'lizi.ru', 'lizo.ru', 'liza.ru',
  'pizi.ru', 'pizo.ru', 'piza.ru',
  'zizi.ru', 'zizo.ru', 'ziza.ru',
  'doba.ru', 'dobi.ru', 'dobo.ru',
  'noba.ru', 'nobi.ru', 'nobo.ru',
  'poba.ru', 'pobi.ru', 'pobo.ru',
  'zoba.ru', 'zobi.ru', 'zobo.ru',
  'voba.ru', 'vobi.ru', 'vobo.ru',
  'loba.ru', 'lobi.ru', 'lobo.ru',
  'roba.ru', 'robi.ru', 'robo.ru',
  'soba.ru', 'sobi.ru', 'sobo.ru',
  'toba.ru', 'tobi.ru', 'tobo.ru',
  'moba.ru', 'mobi.ru', 'mobo.ru',
  'koba.ru', 'kobi.ru', 'kobo.ru',
  'zova.ru', 'zovi.ru', 'zovo.ru',
  'vova.ru', 'vovi.ru', 'vovo.ru',
  'lova.ru', 'lovi.ru', 'lovo.ru',
  'rova.ru', 'rovi.ru', 'rovo.ru',
  'dova.ru', 'dovi.ru', 'dovo.ru',
  'nova.ru', 'novi.ru', 'novo.ru',
  'pova.ru', 'povi.ru', 'povo.ru'
];

function checkDomain(domain) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responseData = '';
    socket.setTimeout(1800);

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
  const freeDomains = [];

  for (let i = 0; i < CANDIDATES.length; i++) {
    const domain = CANDIDATES[i];
    const res = await checkDomain(domain);
    if (res.status === 'FREE') {
      console.log(`🎉 FREE 4-LETTER: ${domain}`);
      freeDomains.push(domain);
    }
    await new Promise(r => setTimeout(r, 40));
  }

  console.log(`\nDONE. Total FREE 4-letter found: ${freeDomains.length}`);
  freeDomains.forEach(d => console.log(`BEGET LINK: https://beget.com/ru/domains?search=${d}`));
}

runCheck();
