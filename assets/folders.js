(() => {
  const folders = [...document.querySelectorAll('[data-folder]')];
  const dialog = document.getElementById('folder-dialog');
  if (!folders.length || typeof dialog?.showModal !== 'function') return;

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const dialogBody = document.getElementById('detail-content');
  const dialogTitle = document.getElementById('detail-title');
  let opener;
  let resizeFrame;
  const plainClick = event => event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;

  function loadImages(root) {
    for (const image of root.querySelectorAll('img[data-src]')) {
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    }
  }

  function layout(folder) {
    const items = [...folder.querySelectorAll('.folder-item')];
    const cloud = folder.querySelector('.folder-items');
    const available = cloud.clientWidth - 24;
    const itemHeight = Math.max(...items.map(item => item.offsetHeight));
    const rowPitch = itemHeight + 11;
    const firstY = -itemHeight - 39;
    const rows = [];
    const twoRows = folder.matches('.folder-gallery, .folder-learning');
    let row = [];
    let width = 0;
    for (const [index, item] of items.entries()) {
      const size = item.offsetWidth;
      if (twoRows ? index === 2 : row.length && width + 10 + size > available) {
        rows.push({ items:row, width });
        row = [];
        width = 0;
      }
      row.push({ item, size });
      width += (row.length > 1 ? 10 : 0) + size;
    }
    if (row.length) rows.push({ items:row, width });
    const rect = folder.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const halfCloud = cloud.clientWidth / 2;
    const safe = getComputedStyle(document.documentElement);
    const safeLeft = parseFloat(safe.getPropertyValue('--safe-left')) || 0;
    const safeRight = parseFloat(safe.getPropertyValue('--safe-right')) || 0;
    const desired = Math.max(20 + safeLeft + halfCloud, Math.min(innerWidth - 20 - safeRight - halfCloud, center));
    folder.style.setProperty('--cloud-shift', `${desired - center}px`);
    const safeTop = 20 + (parseFloat(safe.getPropertyValue('--safe-top')) || 0);
    const minimum = firstY - (rows.length - 1) * rowPitch;
    const shiftY = Math.max(0, safeTop - (rect.top + 18 + minimum - 12));
    folder.style.setProperty('--panel-top', `${minimum + shiftY - 12}px`);
    folder.style.setProperty('--panel-height', `${(rows.length - 1) * rowPitch + itemHeight + 24}px`);
    rows.forEach((entry, index) => {
      let x = -entry.width / 2;
      const room = Math.max(0, (available - entry.width) / 2 - 5);
      const shift = twoRows ? 0 : (index % 2 ? 1 : -1) * Math.min(10, room);
      const rowIndex = twoRows ? rows.length - 1 - index : index;
      entry.items.forEach(({ item, size }) => {
        const i = items.indexOf(item);
        item.style.setProperty('--x', `${x + size / 2 + shift}px`);
        item.style.setProperty('--y', `${firstY - rowIndex * rowPitch + shiftY}px`);
        item.style.setProperty('--r', `${Math.sin(i * 2.1 + 1) * 3}deg`);
        item.style.setProperty('--i', i);
        x += size + 10;
      });
    });
    folder.style.setProperty('--item-count', items.length);
    return rows.length;
  }

  function layoutAll() {
    folders.forEach(layout);
  }

  function setOpen(folder, open) {
    const trigger = folder.querySelector('.folder-trigger');
    const items = folder.querySelector('.folder-items');
    if (!open && items.contains(document.activeElement)) trigger.focus({ preventScroll:true });
    if (open) {
      for (const other of folders) if (other !== folder) setOpen(other, false);
      layout(folder);
      folder.setAttribute('data-open', '');
    } else {
      folder.removeAttribute('data-open');
    }
    trigger.setAttribute('aria-expanded', String(open));
    items.inert = !open;
    for (const item of folder.querySelectorAll('.folder-item')) item.tabIndex = open ? 0 : -1;
  }

  function closeAll() {
    for (const folder of folders) setOpen(folder, false);
  }

  function showDetail(link, pushHistory = true) {
    const source = document.getElementById(link.dataset.detail);
    if (!source) return;
    opener = link.closest('[data-folder]')?.querySelector('.folder-trigger') || link;
    const copy = source.cloneNode(true);
    for (const element of [copy, ...copy.querySelectorAll('[id], [aria-labelledby]')]) {
      element.removeAttribute('id');
      element.removeAttribute('aria-labelledby');
    }
    dialogBody.replaceChildren(copy);
    loadImages(copy);
    if (copy.classList.contains('book') && !copy.querySelector('img')) {
      const note = document.createElement('p');
      note.className = 'dialog-note';
      note.textContent = '书封为主页自绘。';
      dialogBody.append(note);
    }
    dialogTitle.textContent = link.textContent.trim();
    closeAll();
    if (pushHistory && location.hash !== link.hash) history.pushState({ liuliuDetail:true }, '', link.hash);
    if (!dialog.open) dialog.showModal();
    document.dispatchEvent(new Event('motionchange'));
    dialog.scrollTop = 0;
    dialog.querySelector('.dialog-close').focus();
  }

  for (const folder of folders) {
    const trigger = folder.querySelector('.folder-trigger');
    trigger.addEventListener('pointerenter', event => {
      if (finePointer.matches && event.pointerType !== 'touch') {
        setOpen(folder, true);
      }
    });
    trigger.addEventListener('click', () => setOpen(folder, !folder.hasAttribute('data-open')));
    folder.addEventListener('focusout', event => {
      if (!folder.contains(event.relatedTarget)) setOpen(folder, false);
    });
    folder.addEventListener('keydown', event => {
      if (event.key === 'Escape' && folder.hasAttribute('data-open')) {
        event.preventDefault();
        setOpen(folder, false);
        trigger.focus();
      }
    });
    folder.addEventListener('click', event => {
      if (!plainClick(event)) return;
      const link = event.target.closest('.folder-item');
      if (!link) return;
      if (link.dataset.detail) {
        event.preventDefault();
        showDetail(link);
      } else {
        closeAll();
      }
    });
  }

  function closeDetail() {
    if (!dialog.open) return;
    dialog.close();
    if (detailFromHash()) {
      if (history.state?.liuliuDetail) history.back();
      else history.replaceState(null, '', location.href.split('#')[0]);
    }
  }
  dialog.querySelector('.dialog-close').addEventListener('click', closeDetail);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDetail();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    opener?.focus({ preventScroll:true });
    dialogBody.replaceChildren();
    document.dispatchEvent(new Event('motionchange'));
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('[data-folder]')) closeAll();
  });
  document.addEventListener('pointermove', event => {
    if (finePointer.matches && event.pointerType !== 'touch' && !event.target.closest('[data-folder]') && folders.some(folder => folder.hasAttribute('data-open'))) closeAll();
  });
  document.documentElement.addEventListener('pointerleave', event => {
    if (finePointer.matches && event.pointerType !== 'touch') closeAll();
  });
  document.addEventListener('click', event => {
    if (!plainClick(event)) return;
    const detailLink = event.target.closest('[data-detail]');
    if (detailLink && !detailLink.closest('[data-folder]')) {
      event.preventDefault();
      showDetail(detailLink);
      return;
    }
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('folder-item')) return;
    const target = document.getElementById(link.hash.slice(1));
    if (folders.includes(target)) {
      event.preventDefault();
      setOpen(target, true);
      target.querySelector('.folder-trigger').focus({ preventScroll:true });
    }
  });

  document.documentElement.classList.add('folder-ui');
  document.getElementById('folder-details').hidden = true;
  closeAll();
  layoutAll();
  document.fonts?.ready.then(layoutAll);
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layoutAll);
  });
  function detailFromHash() {
    return [...document.querySelectorAll('[data-detail]')].find(link => link.getAttribute('href') === location.hash);
  }
  function syncRoute() {
    const link = detailFromHash();
    if (link) showDetail(link, false);
    else {
      if (dialog.open) dialog.close();
      closeAll();
      const target = document.getElementById(location.hash.slice(1));
      if (folders.includes(target)) setOpen(target, true);
    }
  }
  window.addEventListener('popstate', syncRoute);
  window.addEventListener('hashchange', syncRoute);
  syncRoute();
})();
