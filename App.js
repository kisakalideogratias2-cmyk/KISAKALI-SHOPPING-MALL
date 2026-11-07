// KISAKALI SHOPPING MALL - Master Application Logic & State Controller

const sampleProducts = [
    { id: 1, name: "Luxury Red Rose Bouquet", price: 60000, category: "flowers", img: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=400", vendor: "Morogoro Fresh Bouquets" },
    { id: 2, name: "Custom Surprise Chocolate Box", price: 35000, category: "surprises", img: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=400", vendor: "Kilombero Surprise Boxes" },
    { id: 3, name: "Black Forest Special Cake", price: 45000, category: "cakes", img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=400", vendor: "Ifakara Sweet Bakers" },
    { id: 4, name: "ZENVO™ Modern Designer Wear", price: 75000, category: "fashion", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400", vendor: "Kisakali Luxury Apparel" },
    { id: 5, name: "Smart Skincare & Beauty Kit", price: 55000, category: "electronics", img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400", vendor: "Ifakara Beauty & Gadgets" }
];

// Initialize cart and wishlist from localStorage if available
let shoppingCart = JSON.parse(localStorage.getItem('kisakali_cart')) || [];
let wishlistCount = parseInt(localStorage.getItem('kisakali_wishlist_count')) || 0;

const productList = document.getElementById('product-list');
const cartToggle = document.getElementById('cart-toggle');
const cartClose = document.getElementById('cart-close');
const cartSidebar = document.getElementById('cart-sidebar');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartCount = document.getElementById('cart-count');
const wishlistCounterEl = document.getElementById('wishlist-count');

function renderProducts(filterCategory = 'all') {
    if (!productList) return;
    
    const filtered = filterCategory === 'all' 
        ? sampleProducts 
        : sampleProducts.filter(p => p.category === filterCategory);

    if (filtered.length === 0) {
        productList.innerHTML = '<p style="color: #b3b1ae; grid-column: 1/-1; text-align: center; padding: 40px;">No products found in this category.</p>';
        return;
    }

    productList.innerHTML = filtered.map(product => `
        <div class="product-card" style="background: #363432; border: 1px solid #444; padding: 15px; border-radius: 6px; text-align: center; color: #fff;">
            <img src="${product.img}" alt="${product.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px;">
            <h4 style="margin: 10px 0 5px; font-size: 15px; color: #fff;">${product.name}</h4>
            <p style="font-size:12px; color:#b3b1ae; margin-bottom:8px;"><i class="fas fa-store" style="color:#FE980F;"></i> ${product.vendor}</p>
            <div class="price" style="color: #FE980F; font-weight: bold; font-size: 16px; margin-bottom: 12px;">${product.price.toLocaleString()} TSh</div>
            <button class="btn" style="background: #FE980F; color: #0D0D0D; width: 100%; margin-bottom: 8px; font-weight: bold;" onclick="addToCart(${product.id})">Add to Cart</button>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <a href="product-details.html?id=${product.id}" style="font-size: 12px; color: #FE980F; text-decoration: none;"><i class="fas fa-sliders-h"></i> Customize</a>
                <i class="far fa-heart" style="color: #FE980F; cursor: pointer; font-size: 16px;" title="Add to Wishlist" onclick="addToWishlist(${product.id})"></i>
            </div>
        </div>
    `).join('');
}

// Sidebar Drawer toggles
if(cartToggle) cartToggle.addEventListener('click', () => cartSidebar.classList.add('open'));
if(cartClose) cartClose.addEventListener('click', () => cartSidebar.classList.remove('open'));

window.addToCart = function(id) {
    const prod = sampleProducts.find(p => p.id === id);
    if(prod) {
        shoppingCart.push(prod);
        saveAndRefreshCart();
        cartSidebar.classList.add('open');
    }
}

window.addToWishlist = function(id) {
    wishlistCount++;
    localStorage.setItem('kisakali_wishlist_count', wishlistCount);
    if(wishlistCounterEl) wishlistCounterEl.textContent = wishlistCount;
}

function saveAndRefreshCart() {
    localStorage.setItem('kisakali_cart', JSON.stringify(shoppingCart));
    updateCartDisplay();
}

function updateCartDisplay() {
    if(cartCount) cartCount.textContent = shoppingCart.length;
    if(wishlistCounterEl) wishlistCounterEl.textContent = wishlistCount;
    if(!cartItemsContainer) return;
    
    if(shoppingCart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg" style="color: #b3b1ae; text-align: center; padding: 20px;">Your cart is empty.</p>';
        if(cartTotalAmount) cartTotalAmount.textContent = "0 TSh";
        return;
    }

    // Group items by Vendor to satisfy multi-vendor marketplace structure
    cartItemsContainer.innerHTML = shoppingCart.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:8px;">
            <div>
                <h5 style="font-size:13px; color: #fff;">${item.name}</h5>
                <small style="color:#b3b1ae; font-size:11px;"><i class="fas fa-store"></i> Vendor: ${item.vendor}</small><br>
                <span style="color:#FE980F; font-weight:bold; font-size: 13px;">${item.price.toLocaleString()} TSh</span>
            </div>
            <i class="fas fa-trash-alt" style="color:#ff4d4d; cursor:pointer; padding: 5px;" onclick="removeItem(${index})" title="Remove item"></i>
        </div>
    `).join('');

    const sum = shoppingCart.reduce((acc, curr) => acc + curr.price, 0);
    if(cartTotalAmount) cartTotalAmount.textContent = sum.toLocaleString() + " TSh";
}

window.removeItem = function(index) {
    shoppingCart.splice(index, 1);
    saveAndRefreshCart();
}

// Initial trigger on load
updateCartDisplay();
if(productList) renderProducts('all');

/* ==========================================================
   APPENDED: paste at the very bottom of App.js
   (Rename the file to lowercase app.js so pages can load it.)
   Adds: cart quantities, vendor grouping, delivery fee, toast,
   escaping, phone validation, ?cat / ?q links on shop.html
   ========================================================== */
(function () {
  var DELIVERY_FEE_PER_VENDOR = 3000; // TSh - placeholder, set your real fee (also in checkout_append)

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function money(n) { return Number(n || 0).toLocaleString("en-US") + " TSh"; }
  function validPhone(p) { return /^(0|\+?255)[67]\d{8}$/.test(String(p || "").replace(/[\s-]/g, "")); }
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "ks-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
  }
  function deliveryFee(vendorCount) { return vendorCount * DELIVERY_FEE_PER_VENDOR; }
  window.KS = { esc: esc, money: money, validPhone: validPhone, toast: toast, deliveryFee: deliveryFee };

  function keyOf(it) { return String(it.key || it.id); }

  // Add one item (or +1 if already in cart). Custom items pass their own unique key.
  window.addCartItem = function (item) {
    var k = keyOf(item), found = null;
    shoppingCart.forEach(function (c) { if (keyOf(c) === k) found = c; });
    if (found) { found.qty = (found.qty || 1) + 1; }
    else { item.qty = item.qty || 1; shoppingCart.push(item); }
    saveAndRefreshCart();
  };

  window.addToCart = function (id) {
    var p = sampleProducts.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return;
    window.addCartItem({ id: p.id, name: p.name, price: p.price, img: p.img, vendor: p.vendor, category: p.category });
    if (cartSidebar) cartSidebar.classList.add("open");
    toast("Added to cart");
  };

  window.ksQty = function (index, delta) {
    var it = shoppingCart[index]; if (!it) return;
    it.qty = Math.max(1, (it.qty || 1) + delta);
    saveAndRefreshCart();
  };

  window.addToWishlist = function () {
    wishlistCount++;
    localStorage.setItem("kisakali_wishlist_count", wishlistCount);
    if (wishlistCounterEl) wishlistCounterEl.textContent = wishlistCount;
    toast("Added to your Wishlist");
  };

  // Cart drawer: grouped by vendor, with quantities and delivery fee
  updateCartDisplay = function () {
    var count = shoppingCart.reduce(function (a, i) { return a + (i.qty || 1); }, 0);
    if (cartCount) cartCount.textContent = count;
    if (wishlistCounterEl) wishlistCounterEl.textContent = wishlistCount;
    if (!cartItemsContainer) return;
    if (!shoppingCart.length) {
      cartItemsContainer.innerHTML = '<p class="empty-msg" style="color:#b3b1ae;text-align:center;padding:20px;">Your cart is empty.</p>';
      if (cartTotalAmount) cartTotalAmount.textContent = "0 TSh";
      return;
    }
    var groups = {}, vendors = [], sub = 0;
    shoppingCart.forEach(function (it, i) {
      var v = it.vendor || "Other";
      if (!groups[v]) { groups[v] = []; vendors.push(v); }
      groups[v].push([it, i]);
      sub += it.price * (it.qty || 1);
    });
    var html = vendors.map(function (v) {
      return '<div class="ks-vendor-title"><i class="fas fa-store"></i> ' + esc(v) + '</div>' +
        groups[v].map(function (p) {
          var it = p[0], i = p[1], q = it.qty || 1;
          return '<div class="ks-cart-row"><div class="ks-cart-info"><h5>' + esc(it.name) + '</h5>' +
            (it.custom ? '<small>Customized gift</small>' : '') +
            '<span class="ks-price">' + money(it.price * q) + '</span></div>' +
            '<div class="ks-qty"><button onclick="ksQty(' + i + ',-1)">-</button><b>' + q + '</b>' +
            '<button onclick="ksQty(' + i + ',1)">+</button>' +
            '<i class="fas fa-trash-alt" onclick="removeItem(' + i + ')" title="Remove"></i></div></div>';
        }).join("");
    }).join("");
    var fee = deliveryFee(vendors.length);
    html += '<div class="ks-sum"><span>Delivery (' + vendors.length + ' vendor' + (vendors.length > 1 ? 's' : '') + ')</span><span>' + money(fee) + '</span></div>';
    cartItemsContainer.innerHTML = html;
    if (cartTotalAmount) cartTotalAmount.textContent = money(sub + fee);
  };
  updateCartDisplay();

  // shop.html?cat=cakes  and  shop.html?q=rose
  window.addEventListener("load", function () {
    var q = new URLSearchParams(location.search), cat = q.get("cat"), s = q.get("q");
    if (productList && cat && typeof renderProducts === "function") renderProducts(cat);
    var sb = document.getElementById("search-bar");
    if (sb && s) { sb.value = s; if (typeof searchProducts === "function") searchProducts(); }
  });
})();
