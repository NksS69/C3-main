// Buscador simple para filtrar items y pociones por nombre
(function(){
  const input = document.getElementById('search-input');
  const scope = document.getElementById('search-scope');
  const clearBtn = document.getElementById('search-clear');

  function normalize(str){
    return (str||"").toLowerCase().trim();
  }

  function filterItems(){
    const q = normalize(input.value);
    const s = scope.value; // all | tienda | pociones

    const items = Array.from(document.querySelectorAll('.beneficio'));
    items.forEach(item => {
      const name = normalize(item.dataset.name || item.querySelector('h3')?.textContent);
      const isPocion = item.classList.contains('pocion') || (item.dataset.type === 'pocion');
      if(s === 'tienda' && isPocion){
        item.style.display = 'none';
        return;
      }
      if(s === 'pociones' && !isPocion){
        item.style.display = 'none';
        return;
      }
      if(!q) {
        item.style.display = '';
        return;
      }
      // filtro por nombre
      item.style.display = name.includes(q) ? '' : 'none';
    });
  }

  /* Autocompletado simple: muestra sugerencias basadas en nombres de `.beneficio` */
  const suggestionsBox = document.createElement('div');
  suggestionsBox.className = 'search-suggestions';
  suggestionsBox.style.position = 'absolute';
  suggestionsBox.style.zIndex = 1000;
  suggestionsBox.style.background = '#fff';
  suggestionsBox.style.border = '4px solid rgba(0,0,0,0.6)';
  suggestionsBox.style.padding = '6px';
  suggestionsBox.style.display = 'none';
  suggestionsBox.style.minWidth = '240px';
  document.body.appendChild(suggestionsBox);

  function positionSuggestions(){
    const rect = input.getBoundingClientRect();
    suggestionsBox.style.left = (rect.left + window.scrollX) + 'px';
    suggestionsBox.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  }

  function showSuggestions(list){
    suggestionsBox.innerHTML = '';
    if(!list.length){ suggestionsBox.style.display = 'none'; return; }
    list.slice(0,8).forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-suggestion';
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '6px';
      btn.style.border = '0';
      btn.style.background = 'transparent';
      btn.textContent = name;
      btn.addEventListener('click', function(){
        // buscar el item correspondiente y abrir modal para comprar
        const item = Array.from(document.querySelectorAll('.beneficio')).find(i => (i.dataset.name||i.querySelector('h3')?.textContent||'').toLowerCase() === name.toLowerCase());
        if(item) openModalForItem(item);
        suggestionsBox.style.display = 'none';
      });
      suggestionsBox.appendChild(btn);
    });
    positionSuggestions();
    suggestionsBox.style.display = 'block';
  }

  input?.addEventListener('input', function(){
    const q = normalize(this.value);
    if(!q){ suggestionsBox.style.display = 'none'; return; }
    const names = Array.from(document.querySelectorAll('.beneficio')).map(i => i.dataset.name || i.querySelector('h3')?.textContent).filter(Boolean);
    const filtered = names.filter(n => n.toLowerCase().includes(q)).slice(0,8);
    if(filtered.length) showSuggestions(filtered); else suggestionsBox.style.display = 'none';
  });
  window.addEventListener('resize', positionSuggestions);

  if(input){
    input.addEventListener('input', filterItems);
  }
  if(scope){
    scope.addEventListener('change', filterItems);
  }
  if(clearBtn){
    clearBtn.addEventListener('click', function(){ input.value = ''; scope.value = 'all'; filterItems(); input.focus(); });
  }

  // permitir búsqueda con Enter
  if(input){
    input.addEventListener('keypress', function(e){ if(e.key === 'Enter'){ e.preventDefault(); filterItems(); } });
  }

  /* Modal de compra */
  const modal = document.getElementById('modal');
  const modalOverlay = modal?.querySelector('.modal-overlay');
  const modalCloseButtons = modal ? modal.querySelectorAll('[data-action="close"]') : [];
  const modalItemName = modal ? modal.querySelector('.modal-item-name') : null;
  const modalPrice = modal ? modal.querySelector('.modal-price') : null;
  const modalQuantity = document.getElementById('modal-quantity');
  const modalPayment = document.getElementById('modal-payment');
  const modalTotal = modal ? modal.querySelector('.modal-total') : null;
  const modalConfirm = modal ? modal.querySelector('.modal-confirm') : null;

  function openModalForItem(item){
    if(!modal) return;
    const name = item.dataset.name || item.querySelector('h3')?.textContent || 'Item';
    const price = Number(item.dataset.price || (item.querySelector('.precio')?.textContent||'0').replace(/[^0-9]/g,'')) || 0;
    modalItemName.textContent = name;
    modalPrice.textContent = price;
    modalQuantity.value = 1;
    modalPayment.value = 'paypal';
    modalTotal.textContent = price.toString();
    modal.setAttribute('aria-hidden','false');
    // trap focus simple: focus confirm
    modalConfirm?.focus();
    // store current product on modal element
    modal.dataset.currentName = name;
    modal.dataset.currentPrice = price;
  }

  function closeModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
    delete modal.dataset.currentName;
    delete modal.dataset.currentPrice;
  }

  // actualizar total cuando cambie cantidad
  function updateTotal(){
    if(!modal) return;
    const price = Number(modal.dataset.currentPrice || 0);
    const qty = Math.max(1, Number(modalQuantity.value || 1));
    modalTotal.textContent = String(price * qty);
  }

  /* Carrito local (localStorage) */
  const CART_KEY = 'mi_carrito_local';
  const cartToggle = document.getElementById('cart-toggle');
  const cartPanel = document.createElement('div');
  cartPanel.className = 'cart-panel';
  cartPanel.setAttribute('aria-hidden','true');
  cartPanel.innerHTML = `<h4>Tu carrito</h4><div class="cart-items"></div><div class="cart-footer"><div class="cart-total">Total: $<span class="cart-total-amt">0</span></div><div><button class="btn-comprar cart-checkout">Pagar</button></div></div>`;
  document.body.appendChild(cartPanel);
  const cartItemsContainer = cartPanel.querySelector('.cart-items');

  let cart = [];

  function loadCart(){
    try{ cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }catch(e){ cart = []; }
  }
  function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  function renderCart(){
    cartItemsContainer.innerHTML = '';
    let total = 0;
    cart.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `<img src="${c.image||'favicon.ico'}" alt="${c.name}"><div class="meta"><div class="name">${c.name}</div><div class="qty">x${c.qty} — $${c.price} c/u</div></div><div class="actions"><button class="btn-comprar cart-remove" data-index="${idx}">Eliminar</button></div>`;
      cartItemsContainer.appendChild(row);
      total += c.price * c.qty;
    });
    cartPanel.querySelector('.cart-total-amt').textContent = String(total);
    document.getElementById('cart-count').textContent = String(cart.reduce((s,i)=>s+i.qty,0));
  }

  function toggleCart(){
    const hidden = cartPanel.getAttribute('aria-hidden') === 'true';
    cartPanel.setAttribute('aria-hidden', hidden ? 'false' : 'true');
  }

  cartToggle?.addEventListener('click', function(){ toggleCart(); loadCart(); renderCart(); });

  cartPanel.addEventListener('click', function(e){
    const rem = e.target.closest('.cart-remove');
    if(rem){ const idx = Number(rem.dataset.index); cart.splice(idx,1); saveCart(); renderCart(); }
  });

  cartPanel.querySelector('.cart-checkout')?.addEventListener('click', function(){
    if(!cart.length){ alert('El carrito está vacío'); return; }
    // simulación de pago: vaciar carrito
    alert('Compra simulada. Gracias por su compra. Total: $' + cart.reduce((s,i)=>s+i.price*i.qty,0));
    cart = []; saveCart(); renderCart(); toggleCart();
  });

  function addToCartObject(obj){
    // obj: { name, price, qty, image }
    const existing = cart.find(c=>c.name === obj.name && c.price === obj.price);
    if(existing){ existing.qty += obj.qty; } else { cart.push(Object.assign({}, obj)); }
    saveCart(); renderCart();
  }

  loadCart(); renderCart();

  // abrir modal al click en comprar (delegación)
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.btn-comprar');
    if(!btn) return;
    if(btn.disabled) return;
    // si el botón está dentro del modal (confirm/cancel) dejar que lo maneje el modal
    if(btn.closest('.modal')) return;
    const item = btn.closest('.beneficio');
    if(!item) return;
    openModalForItem(item);
  });

  // cerrar modal: overlay, botones con data-action
  modalOverlay?.addEventListener('click', closeModal);
  modalCloseButtons.forEach(b => b.addEventListener('click', closeModal));

  // cantidad y pago
  modalQuantity?.addEventListener('input', updateTotal);
  modalPayment?.addEventListener('change', function(){});

  // confirmar compra (por ahora muestra un resumen en consola y cierra)
  modalConfirm?.addEventListener('click', function(){
    const name = modal.dataset.currentName || modalItemName.textContent;
    const price = Number(modal.dataset.currentPrice || modalPrice.textContent || 0);
    const qty = Math.max(1, Number(modalQuantity.value||1));
    const payment = modalPayment.value;
    const total = price * qty;
    // Aquí podrías integrar un flujo real; por ahora registramos la compra
    console.info('Compra simulada:', { name, price, qty, payment, total });
    alert('Compra simulada: ' + name + ' x' + qty + ' — Total: ' + total + '$');
    // Si el usuario compra ahora, podemos vaciar el carrito o solo simular
    closeModal();
  });

  // botón 'Añadir al carrito' en el modal
  const modalAddCart = modal ? modal.querySelector('.modal-add-cart') : null;
  modalAddCart?.addEventListener('click', function(){
    const name = modal.dataset.currentName || modalItemName.textContent;
    const price = Number(modal.dataset.currentPrice || modalPrice.textContent || 0);
    const qty = Math.max(1, Number(modalQuantity.value||1));
    addToCartObject({ name, price, qty, image: null });
    alert('Añadido al carrito: ' + name + ' x' + qty);
    closeModal();
  });

  /* Hover tooltip for items: shows a small card on pointer hover */
  const tooltip = document.createElement('div');
  tooltip.className = 'item-tooltip';
  tooltip.innerHTML = '<div class="tt-name"></div><div class="tt-desc"></div><div class="tt-price"></div>';
  document.body.appendChild(tooltip);

  function showTooltipForItem(item){
    const name = item.dataset.name || item.querySelector('h3')?.textContent || 'Item';
    const price = Number(item.dataset.price || (item.querySelector('.precio')?.textContent||'0').replace(/[^0-9]/g,'')) || 0;
    const desc = item.querySelector('.descripcion')?.textContent || '';
    tooltip.querySelector('.tt-name').textContent = name;
    tooltip.querySelector('.tt-desc').textContent = desc;
    tooltip.querySelector('.tt-price').textContent = 'Precio: $' + price;
    tooltip.classList.add('visible');
  }

  function positionTooltip(e){
    const pad = 12;
    const w = tooltip.offsetWidth;
    const h = tooltip.offsetHeight;
    let left = e.pageX + pad;
    let top = e.pageY + pad;
    if(left + w > document.documentElement.scrollWidth) left = e.pageX - w - pad;
    if(top + h > document.documentElement.scrollHeight) top = e.pageY - h - pad;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function hideTooltip(){ tooltip.classList.remove('visible'); }

  function attachHoverCards(){
    document.querySelectorAll('.beneficio').forEach(item=>{
      if(item.__hoverBound) return;
      item.__hoverBound = true;
      item.addEventListener('pointerenter', function(e){ showTooltipForItem(item); positionTooltip(e); });
      item.addEventListener('pointermove', function(e){ positionTooltip(e); });
      item.addEventListener('pointerleave', hideTooltip);
    });
  }

  // cerrar con Escape
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ closeModal(); } });
  /********** Subastas (localStorage) **********/
  const AUCTIONS_KEY = 'mi_subastas_local';
  const auctionsContainer = document.getElementById('auctions-container');
  const auctionCreateBtn = document.getElementById('auction-create');
  const auctionTitle = document.getElementById('auction-title');
  const auctionDesc = document.getElementById('auction-desc');
  const auctionImage = document.getElementById('auction-image');
  const auctionStart = document.getElementById('auction-start');
  const auctionDuration = document.getElementById('auction-duration');

  let auctions = [];

  function loadAuctions(){
    try{
      const raw = localStorage.getItem(AUCTIONS_KEY);
      auctions = raw ? JSON.parse(raw) : [];
    }catch(e){ auctions = []; }
  }

  function saveAuctions(){
    localStorage.setItem(AUCTIONS_KEY, JSON.stringify(auctions));
  }

  function renderAuctions(){
    auctionsContainer.innerHTML = '';
    auctions.forEach(a => {
      const card = document.createElement('article');
      card.className = 'auction-card beneficio' + (a.closed ? ' closed' : '');
      card.dataset.id = a.id;
      card.innerHTML = `
        <img src="${a.image||'favicon.ico'}" alt="${escapeHtml(a.title)}">
        <div class="meta">
          <h4>${escapeHtml(a.title)}</h4>
          <p>${escapeHtml(a.description)}</p>
          <div class="current">Actual: $<span class="current-bid">${a.currentBid}</span> <span class="current-bidder">${escapeHtml(a.currentBidder||'—')}</span></div>
          <div class="time-left">Tiempo: <span class="time-${a.id}">${formatRemaining(a.endAt)}</span></div>
        </div>
        <div class="actions">
          <input class="bid-input" type="number" min="1" placeholder="Tu puja">
          <button class="btn-comprar btn-bid">Pujar</button>
        </div>`;
      auctionsContainer.appendChild(card);
    });
    // ensure hover handlers are attached for new auction cards
    attachHoverCards();
  }

  function formatRemaining(endAt){
    const now = Date.now();
    const diff = Math.max(0, endAt - now);
    if(diff === 0) return '0s';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if(mins>0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

  // simple timer to update time left and close ended auctions
  setInterval(function(){
    const now = Date.now();
    let changed = false;
    auctions.forEach(a => {
      if(a.closed) return;
      if(now >= a.endAt){ a.closed = true; changed = true; }
      const span = document.querySelector(`.time-${a.id}`);
      if(span) span.textContent = formatRemaining(a.endAt);
      const card = document.querySelector(`.auction-card[data-id="${a.id}"]`);
      if(card) card.classList.toggle('closed', !!a.closed);
    });
    if(changed) saveAuctions();
  }, 1000);

  // Create auction (reads optional image as dataURL)
  auctionCreateBtn?.addEventListener('click', function(){
    const title = (auctionTitle.value||'').trim();
    const desc = (auctionDesc.value||'').trim();
    const start = Math.max(1, Number(auctionStart.value||1));
    const durationMin = Math.max(1, Number(auctionDuration.value||60));
    if(!title){ alert('Introduce un nombre para el item'); return; }
    // read image file if provided
    const file = auctionImage.files && auctionImage.files[0];
    if(file){
      const reader = new FileReader();
      reader.onload = function(ev){
        createAuctionObject(title, desc, start, durationMin, ev.target.result);
      };
      reader.readAsDataURL(file);
    }else{
      createAuctionObject(title, desc, start, durationMin, null);
    }
  });

  function createAuctionObject(title, desc, start, durationMin, image){
    const id = 'a' + Date.now();
    const now = Date.now();
    const obj = { id, title, description: desc, image: image, startingPrice: start, currentBid: start, currentBidder: null, bids: [], createdAt: now, endAt: now + durationMin*60000, closed:false };
    auctions.unshift(obj);
    saveAuctions();
    renderAuctions();
    // clear form
    auctionTitle.value = '';
    auctionDesc.value = '';
    auctionImage.value = '';
    auctionStart.value = '100';
    auctionDuration.value = '60';
  }

  // Delegate bid clicks
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.btn-bid');
    if(!btn) return;
    const card = btn.closest('.auction-card');
    if(!card) return;
    const id = card.dataset.id;
    const auction = auctions.find(x=>x.id===id);
    if(!auction || auction.closed){ alert('La subasta ya finalizó'); return; }
    const input = card.querySelector('.bid-input');
    const amount = Math.max(1, Number(input.value||0));
    if(amount <= auction.currentBid){ alert('La puja debe ser mayor que la actual'); return; }
    const bidder = prompt('Tu nombre para la puja (se mostrará a otros)', 'Jugador');
    if(!bidder) return;
    auction.currentBid = amount;
    auction.currentBidder = bidder;
    auction.bids.push({ bidder, amount, time: Date.now() });
    saveAuctions();
    renderAuctions();
  });

  // init
  loadAuctions();
  renderAuctions();
  // attach hover tooltip handlers for existing items
  attachHoverCards();

})();
