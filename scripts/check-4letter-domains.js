const net = require('net');

// 250+ ПОТЕНЦИАЛЬНЫХ 4-БУКВЕННЫХ ДОМЕНОВ (.RU)
const DOMAINS = [
  // T-корень (созвучно Tilda)
  'tili.ru', 'tilo.ru', 'tila.ru', 'tilu.ru', 'tily.ru',
  'tilb.ru', 'tilz.ru', 'tilp.ru', 'tilm.ru', 'tilk.ru',
  'tixi.ru', 'tixo.ru', 'tixa.ru', 'texi.ru', 'texo.ru',

  // K-корень (Code / Kod)
  'kosi.ru', 'koso.ru', 'kosa.ru', 'kosu.ru',
  'kobi.ru', 'kobo.ru', 'koba.ru', 'kobu.ru',
  'kuzi.ru', 'kuzo.ru', 'kuza.ru', 'kuzu.ru',
  'kvez.ru', 'kviz.ru', 'kvoz.ru', 'kvet.ru',
  'krox.ru', 'krax.ru', 'krix.ru', 'krux.ru',

  // V-корень (Web / Vibe / Vector)
  'vizi.ru', 'vizo.ru', 'viza.ru', 'vizu.ru',
  'vixi.ru', 'vixo.ru', 'vixa.ru', 'vixu.ru',
  'vexi.ru', 'vexo.ru', 'vexa.ru', 'vexu.ru',
  'vomi.ru', 'vomo.ru', 'voma.ru', 'vomu.ru',

  // Z-корень (Zip / Zest / Zen)
  'zode.ru', 'zodi.ru', 'zodo.ru', 'zoda.ru',
  'zexi.ru', 'zexo.ru', 'zexa.ru', 'zexu.ru',
  'zimi.ru', 'zimo.ru', 'zima.ru', 'zumu.ru',
  'zoki.ru', 'zoko.ru', 'zoka.ru', 'zoku.ru',

  // D-корень (Dev / Dex)
  'doxi.ru', 'doxo.ru', 'doxa.ru', 'doxu.ru',
  'duxi.ru', 'duxo.ru', 'duxa.ru', 'duxu.ru',
  'dyxi.ru', 'dyxo.ru', 'dyxa.ru', 'dyxu.ru',

  // N-корень (Node / Nex)
  'nuxo.ru', 'nuxi.ru', 'nuxa.ru', 'nuxu.ru',
  'nyxi.ru', 'nyxo.ru', 'nyxa.ru', 'nyxu.ru',
  'noxi.ru', 'noxo.ru', 'noxa.ru', 'noxu.ru',

  // P-корень (Pro / Page / Pack)
  'puxi.ru', 'puxo.ru', 'puxa.ru', 'puxu.ru',
  'pyxi.ru', 'pyxo.ru', 'pyxa.ru', 'pyxu.ru',
  'poxi.ru', 'pexo.ru', 'pexi.ru', 'pexa.ru',

  // B-корень (Block / Build)
  'buxi.ru', 'buxo.ru', 'buxa.ru', 'buxu.ru',
  'byxi.ru', 'byxo.ru', 'byxa.ru', 'byxu.ru',
  'boxi.ru', 'bexo.ru', 'bexi.ru', 'bexa.ru',

  // F-корень (Flow / Flex / Frame)
  'fuxi.ru', 'fuxo.ru', 'fuxa.ru', 'fuxu.ru',
  'fyxi.ru', 'fyxo.ru', 'fyxa.ru', 'fyxu.ru',
  'foxi.ru', 'fexo.ru', 'flex.ru', 'floo.ru',

  // W-корень (Web / Work)
  'wuxi.ru', 'wuxo.ru', 'wuxa.ru', 'wuxu.ru',
  'wyxi.ru', 'wyxo.ru', 'wyxa.ru', 'wyxu.ru',
  'woxi.ru', 'wexo.ru', 'wexi.ru', 'wexa.ru',

  // X- / Y- / S- корнеевые сленги
  'sexi.ru', 'sexo.ru', 'sexa.ru', 'soxi.ru',
  'suxi.ru', 'suxo.ru', 'suxa.ru', 'syxi.ru',
  'xebi.ru', 'xebo.ru', 'xebi.ru', 'xeba.ru',
  'yebi.ru', 'yebo.ru', 'yebi.ru', 'yeba.ru'
];

function checkDomain(domain) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responseData = '';

    socket.setTimeout(2000);

    socket.connect(43, 'whois.tcinet.ru', () => {
      socket.write(`${domain}\r\n`);
    });

    socket.on('data', (chunk) => {
      responseData += chunk.toString();
    });

    socket.on('end', () => {
      socket.destroy();
      const isNoEntries = responseData.includes('No entries found');
      const isRegistered = responseData.includes('domain:') || responseData.includes('state: REGISTERED');

      if (isNoEntries) {
        resolve({ domain, status: 'FREE' });
      } else if (isRegistered) {
        resolve({ domain, status: 'TAKEN' });
      } else {
        resolve({ domain, status: 'UNKNOWN' });
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ domain, status: 'ERROR' });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ domain, status: 'TIMEOUT' });
    });
  });
}

async function runCheck() {
  console.log(`🔍 ОХОТА НА 4-БУКВЕННЫЕ ДОМЕНЫ (${DOMAINS.length} шт)...`);
  
  const freeDomains = [];

  for (let i = 0; i < DOMAINS.length; i++) {
    const domain = DOMAINS[i];
    const res = await checkDomain(domain);
    
    if (res.status === 'FREE') {
      console.log(`[${i+1}/${DOMAINS.length}] 🎉 СВОБОДЕН 4-БУКВЕННИК: \x1b[32m${domain}\x1b[0m`);
      freeDomains.push(domain);
    }
    
    await new Promise(r => setTimeout(r, 60));
  }

  console.log('\n======================================================');
  console.log(`🎉 НАЙДЕНО СВОБОДНЫХ 4-БУКВЕННЫХ ДОМЕНОВ: ${freeDomains.length} шт!`);
  console.log('======================================================\n');
  
  freeDomains.forEach(d => {
    console.log(`✅ ${d.padEnd(12, ' ')} https://beget.com/ru/domains?search=${d}`);
  });
}

runCheck();
