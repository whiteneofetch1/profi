const net = require('net');

// ЭКСТРЕННЫЙ МАССИВНЫЙ ПОИСК ТОЛЬКО 5-БУКВЕННЫХ ДОМЕНОВ (.RU)
const DOMAINS_TO_CHECK = [
  // 1. Код, Разработка, Скрипты
  'kodic.ru', 'kodyx.ru', 'kodos.ru', 'kodox.ru', 'kodix.ru', 'kodiq.ru', 'kodys.ru', 'kodyz.ru',
  'modic.ru', 'modyx.ru', 'modos.ru', 'modox.ru', 'modix.ru', 'modiq.ru', 'modys.ru', 'modyz.ru',
  'nodic.ru', 'nodyx.ru', 'nodos.ru', 'nodox.ru', 'nodix.ru', 'nodiq.ru', 'nodys.ru', 'nodyz.ru',
  'podic.ru', 'podyx.ru', 'podos.ru', 'podox.ru', 'podix.ru', 'podiq.ru', 'podys.ru', 'podyz.ru',
  'devic.ru', 'devyx.ru', 'devos.ru', 'devox.ru', 'devix.ru', 'deviq.ru', 'devys.ru', 'devyz.ru',

  // 2. Блоки, Верстка, Конструктор, Сетка
  'bloxi.ru', 'bloxo.ru', 'bloxe.ru', 'bloxy.ru', 'bloxz.ru', 'bloxs.ru',
  'gridi.ru', 'grido.ru', 'gridx.ru', 'gridy.ru', 'gridz.ru', 'grids.ru',
  'pagei.ru', 'pageo.ru', 'pagex.ru', 'pagey.ru', 'pagez.ru', 'pages.ru',
  'sitei.ru', 'siteo.ru', 'sitex.ru', 'sitey.ru', 'sitez.ru', 'sites.ru',
  'flowi.ru', 'flowo.ru', 'flowx.ru', 'flowy.ru', 'flowz.ru', 'flows.ru',

  // 3. Веб, Приложения, Хаб, Лаборатория
  'webic.ru', 'webyx.ru', 'webos.ru', 'webox.ru', 'webix.ru', 'webiq.ru', 'webys.ru', 'webba.ru',
  'appic.ru', 'appyx.ru', 'appos.ru', 'appox.ru', 'appix.ru', 'appiq.ru', 'appys.ru', 'appli.ru',
  'hubic.ru', 'hubyx.ru', 'hubos.ru', 'hubox.ru', 'hubix.ru', 'hubiq.ru', 'hubys.ru',
  'labic.ru', 'labyx.ru', 'labos.ru', 'labox.ru', 'labix.ru', 'labiq.ru', 'labys.ru',

  // 4. Профи, Эксперты, Работа, Сервис
  'proxi.ru', 'proxo.ru', 'proxx.ru', 'proxs.ru', 'proxz.ru',
  'prozo.ru', 'prozi.ru', 'proza.ru', 'proly.ru', 'prolo.ru',
  'jobex.ru', 'jobix.ru', 'jobio.ru', 'jobly.ru', 'jobos.ru',

  // 5. Дизайн, Пиксель, Графика, Студия
  'pixeo.ru', 'pixix.ru', 'pixox.ru', 'pixiq.ru', 'pixiz.ru', 'pixos.ru',
  'studi.ru', 'studo.ru', 'studx.ru', 'drawi.ru', 'drawo.ru', 'drawx.ru',

  // 6. Tild-созвучные (5 букв)
  'tildi.ru', 'tildo.ru', 'tildy.ru', 'tilto.ru', 'tilti.ru', 'tiltz.ru',
  'tilla.ru', 'tillo.ru', 'tilli.ru', 'tillz.ru', 'tilba.ru', 'tilbo.ru',

  // 7. Технологичные эуфонические бренды (5 букв)
  'texio.ru', 'texic.ru', 'texyx.ru', 'texis.ru',
  'vibri.ru', 'vibro.ru', 'vibex.ru', 'vobix.ru',
  'zexis.ru', 'zexio.ru', 'zobic.ru', 'zobyx.ru',
  'luxio.ru', 'luxic.ru', 'luxys.ru', 'foxio.ru'
];

function checkDomain(domain) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responseData = '';

    socket.setTimeout(2500);

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
        resolve({ domain, status: 'FREE', message: 'СВОБОДЕН ✅' });
      } else if (isRegistered) {
        resolve({ domain, status: 'TAKEN', message: 'Занят ❌' });
      } else {
        resolve({ domain, status: 'UNKNOWN', message: 'Неизвестно ⚠️' });
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ domain, status: 'ERROR', message: `Ошибка (${err.message})` });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ domain, status: 'TIMEOUT', message: 'Таймаут' });
    });
  });
}

async function runCheck() {
  console.log(`🔍 ЭКСТРЕННАЯ ПРОВЕРКА 5-БУКВЕННЫХ ДОМЕНОВ (${DOMAINS_TO_CHECK.length} шт)...`);
  
  const results = [];

  for (let i = 0; i < DOMAINS_TO_CHECK.length; i++) {
    const domain = DOMAINS_TO_CHECK[i];
    const res = await checkDomain(domain);
    results.push(res);
    
    if (res.status === 'FREE') {
      console.log(`[${i+1}/${DOMAINS_TO_CHECK.length}] ${domain.padEnd(16, ' ')} -> \x1b[32mСВОБОДЕН ✅\x1b[0m`);
    }
    
    await new Promise(r => setTimeout(r, 80));
  }

  const freeDomains = results.filter(r => r.status === 'FREE');
  console.log('\n======================================================');
  console.log(`🎉 НАЙДЕНО СВОБОДНЫХ 5-БУКВЕННИКОВ: ${freeDomains.length} шт!`);
  console.log('======================================================\n');
  
  freeDomains.forEach(d => {
    console.log(`✅ ${d.domain.padEnd(16, ' ')} https://beget.com/ru/domains?search=${d.domain}`);
  });
}

runCheck();
