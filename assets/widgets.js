(() => {
  const motionButton = document.getElementById('motion-toggle');
  const motionStatus = document.getElementById('motion-status');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  function updateMotion() {
    document.documentElement.dataset.motionPaused = String(paused);
    motionButton.disabled = reduceMotion.matches;
    motionButton.setAttribute('aria-pressed', String(paused || reduceMotion.matches));
    motionButton.textContent = reduceMotion.matches ? '系统静态' : paused ? '恢复动画' : '暂停动画';
    motionButton.setAttribute('aria-label', reduceMotion.matches ? '系统已减少动态效果' : paused ? '恢复壁纸和卡片动画' : '暂停壁纸和卡片动画');
    motionButton.title = reduceMotion.matches ? '系统已开启减少动态效果，动画保持静止' : motionButton.getAttribute('aria-label');
    motionStatus.textContent = reduceMotion.matches ? '系统已减少动态效果，壁纸和卡片保持静止。' : paused ? '壁纸和卡片动画已暂停。' : '壁纸和卡片动画运行中。';
    document.dispatchEvent(new Event('motionchange'));
  }
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
  reduceMotion.addEventListener('change', updateMotion);
  updateMotion();
  const storageKey = 'liuliu.countdowns.v1';
  const dayMs = 86400000;
  const dayInBeijing = now => Math.floor((now + 8 * 3600000) / dayMs);
  const validDate = value => typeof value === 'string' && (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
  const countdownRows = [...document.querySelectorAll('.countdown-row')];
  const editButton = document.getElementById('countdown-edit');
  const editor = document.getElementById('countdown-dialog');
  const form = document.getElementById('countdown-form');
  const status = document.getElementById('countdown-status');
  let events = ['事件一', '事件二', '事件三', '事件四'].map(name => ({ name, date:'' }));
  let renderedDay;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Array.isArray(saved)) events = events.map((fallback, i) => ({
      name: typeof saved[i]?.name === 'string' ? saved[i].name.trim().slice(0, 30) || fallback.name : fallback.name,
      date: validDate(saved[i]?.date) ? saved[i].date : ''
    }));
  } catch {
    status.textContent = '无法读取已保存的倒计时，可点击编辑重新设置。';
    status.hidden = false;
  }
  function renderCountdowns() {
    renderedDay = dayInBeijing(Date.now());
    events.forEach((event, i) => {
      const row = countdownRows[i];
      const value = row.querySelector('.countdown-value');
      let label = '待设置';
      if (event.date) {
        const days = Date.parse(`${event.date}T00:00:00Z`) / dayMs - renderedDay;
        label = days > 0 ? `剩 ${days} 天` : days === 0 ? '就是今天' : `已过 ${-days} 天`;
        value.dateTime = event.date;
      } else value.removeAttribute('datetime');
      row.querySelector('.countdown-name').textContent = event.name;
      value.textContent = label;
      row.title = event.date ? `${event.name} · ${event.date}（北京时间）` : event.name;
      row.setAttribute('aria-label', `${event.name}，${label}${event.date ? `，目标日期 ${event.date}` : ''}`);
    });
  }
  editButton.hidden = false;
  editButton.addEventListener('click', () => {
    events.forEach((event, i) => {
      form.elements[`event-name-${i}`].value = event.name;
      form.elements[`event-date-${i}`].value = event.date;
    });
    editor.showModal();
    document.dispatchEvent(new Event('motionchange'));
  });
  for (const id of ['countdown-close', 'countdown-cancel']) document.getElementById(id).addEventListener('click', () => editor.close());
  editor.addEventListener('close', () => {
    editButton.focus({ preventScroll:true });
    document.dispatchEvent(new Event('motionchange'));
  });
  editor.addEventListener('click', event => {
    const rect = editor.getBoundingClientRect();
    if (event.target === editor && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) editor.close();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    events = events.map((previous, i) => ({
      name: form.elements[`event-name-${i}`].value.trim().slice(0, 30) || `事件${['一','二','三','四'][i]}`,
      date: form.elements[`event-date-${i}`].value
    }));
    try {
      localStorage.setItem(storageKey, JSON.stringify(events));
      status.hidden = true;
    } catch {
      status.textContent = '本次修改已生效，但浏览器未允许保存；刷新后可能丢失。';
      status.hidden = false;
    }
    renderCountdowns();
    editor.close();
  });
  renderCountdowns();

  const face = document.getElementById('clock-face');
  const date = document.getElementById('clock-date');
  const readable = document.getElementById('clock-readable');
  const paths = ['M5 2h12', 'M19 5v12', 'M19 21v12', 'M5 36h12', 'M3 21v12', 'M3 5v12', 'M5 19h12'];
  const masks = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
  face.innerHTML = Array.from({length:8}, (_, index) => index === 2 || index === 5
    ? '<span class="clock-colon"><i></i><i></i></span>'
    : `<svg class="clock-digit" viewBox="0 0 22 38">${paths.map(path => `<path d="${path}"/>`).join('')}</svg>`).join('');
  const digits = [...face.querySelectorAll('.clock-digit')];
  const dateFormat = new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai', year:'numeric', month:'long', day:'numeric', weekday:'long'});
  const timeFormat = new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'});
  function updateClock() {
    const now = new Date();
    const time = timeFormat.format(now);
    date.textContent = dateFormat.format(now);
    readable.textContent = time;
    readable.dateTime = now.toISOString();
    [...time.replaceAll(':', '')].forEach((digit, index) => {
      [...digits[index].children].forEach((segment, bit) => segment.classList.toggle('lit', Boolean(masks[Number(digit)] & (1 << bit))));
    });
    if (dayInBeijing(now.getTime()) !== renderedDay) renderCountdowns();
  }
  updateClock();
  setInterval(updateClock, 1000);
})();
