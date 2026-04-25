// Cart State Management using LocalStorage
class CartManager {
  constructor() {
    console.log("CartManager: Initializing...");
    window.cart = this;
    this.items = [];
    this.init();
  }

  init() {
    console.log("CartManager: Initializing UI...");
    this.loadFromStorage();
    this.renderCartItems();
    this.setupEventListeners();
    
    // Listen for storage changes from other tabs/scripts
    window.addEventListener('storage', (e) => {
      if (e.key === 'suravi_pickles_cart') {
        console.log("CartManager: Storage changed, re-loading...");
        this.loadFromStorage();
        this.renderCartItems();
      }
    });
  }

  loadFromStorage() {
    try {
      this.items = JSON.parse(localStorage.getItem('suravi_pickles_cart') || '[]');
      console.log("CartManager: Loaded items:", this.items.length);
    } catch (e) {
      console.error("CartManager: storage error:", e);
      this.items = [];
    }
    this.updateCartCount();
  }

  save() {
    try {
      localStorage.setItem('suravi_pickles_cart', JSON.stringify(this.items));
      console.log("CartManager: Saved to localStorage. Item count:", this.items.length);
      this.updateCartCount();
      this.renderCartItems();
    } catch (e) {
      console.error("CartManager: Save error:", e);
    }
  }

  addItem(product) {
    console.log("CartManager: Attempting to add item:", product);
    try {
      const existingItem = this.items.find(item => item.id === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
        console.log("CartManager: Increased quantity for:", product.name);
      } else {
        this.items.push({ ...product, quantity: 1 });
        console.log("CartManager: Added new item:", product.name);
      }
      this.save();
      this.showToast(`${product.name} added to cart!`);
    } catch (e) {
      console.error("CartManager: Add error:", e);
    }
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  }

  updateQuantity(id, newQuantity) {
    if (newQuantity < 1) return;
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.quantity = newQuantity;
      this.save();
    }
  }

  getCartTotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  updateCartCount() {
    const counts = document.querySelectorAll('.cart-count');
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    console.log("CartManager: Updating cart count to:", totalItems);
    counts.forEach(counter => {
      counter.textContent = totalItems;
      counter.style.display = totalItems > 0 ? 'flex' : 'none';
    });
  }

  showToast(message) {
    try {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--accent-yellow)"></i> ${message}`;

      container.appendChild(toast);

      // Animate in
      setTimeout(() => toast.classList.add('show'), 10);

      // Remove after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } catch (e) {
      console.error("CartManager: Toast error:", e);
      alert(message); // Fallback to alert
    }
  }

  renderCartItems() {
    const cartContainer = document.getElementById('cart-items-container');
    const orderSubtotal = document.getElementById('order-subtotal');
    const orderShipping = document.getElementById('order-shipping');
    const orderTotal = document.getElementById('order-total');

    if (!cartContainer) return; 

    console.log("CartManager: Rendering cart items...");

    if (this.items.length === 0) {
      cartContainer.innerHTML = `
        <div class="empty-cart">
          <i class="fas fa-shopping-basket"></i>
          <h3>Your cart is empty</h3>
          <p>Explore our authentic traditional pickles and add some to your cart.</p>
          <a href="products.html" class="btn btn-primary" style="margin-top: 1rem;">Shop Now</a>
        </div>
      `;
      if (orderSubtotal) {
        const summary = document.querySelector('.order-summary');
        if (summary) summary.style.display = 'none';
      }
      return;
    }

    if (orderSubtotal) {
      const summary = document.querySelector('.order-summary');
      if (summary) summary.style.display = 'block';
    }

    cartContainer.innerHTML = this.items.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">
            ₹${item.price} x ${item.quantity} = <strong>₹${item.price * item.quantity}</strong>
          </div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" type="button" onclick="cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
          <input type="number" class="qty-input" value="${item.quantity}" readonly>
          <button class="qty-btn" type="button" onclick="cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
        </div>
        <button class="remove-btn" type="button" onclick="cart.removeItem('${item.id}')" title="Remove">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');

    if (orderSubtotal) {
      const subtotal = this.getCartTotal();
      const shipping = subtotal > 999 ? 0 : 75; 
      let giftFee = 0;
      const giftRadio = document.querySelector('input[name="orderType"][value="gift"]');
      if (giftRadio && giftRadio.checked) giftFee = 99;
      
      const giftRow = document.getElementById('order-gift-row');
      if (giftRow) giftRow.style.display = giftFee > 0 ? 'flex' : 'none';
      
      orderSubtotal.textContent = `₹${subtotal}`;
      orderShipping.textContent = shipping === 0 ? 'Free' : `₹${shipping}`;
      if (orderTotal) orderTotal.textContent = `₹${subtotal + shipping + giftFee}`;
    }
  }

  async saveOrderToFirestore(formData, finalTotal, orderDetails) {
    // ... no changes needed here, handled by PhonePe backend mostly
  }

  setupEventListeners() {
    console.log("CartManager: Setting up event listeners...");
    
    // Checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.items.length === 0) {
          alert("Your cart is empty!");
          return;
        }

        const formData = new FormData(checkoutForm);

        // Build order details string
        let orderDetails = "ORDER DETAILS:\n\n";
        this.items.forEach(item => {
          orderDetails += `${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}\n`;
        });

        const subtotal = this.getCartTotal();
        const shipping = subtotal > 999 ? 0 : 75;
        let giftFee = formData.get('orderType') === 'gift' ? 99 : 0;
        let finalTotal = subtotal + shipping + giftFee;
        
        orderDetails += `\nSubtotal: ₹${subtotal}\nShipping: ₹${shipping}`;
        if (giftFee > 0) orderDetails += `\nGift Packing: ₹${giftFee}`;
        orderDetails += `\nTotal: ₹${finalTotal}\n`;

        formData.append('Order_Details', orderDetails);
        formData.append('_subject', 'New Order from Suravi Pickles!');
        formData.append('_captcha', 'false');

        const paymentMethod = formData.get('payment');

        // Save to Firestore directly ONLY if not using PhonePe (PhonePe backend handles it)
        if (paymentMethod !== 'phonepe') {
          this.saveOrderToFirestore(formData, finalTotal, orderDetails);
        }

        // Handle PhonePe Payment Gateway Intercept
        if (paymentMethod === 'phonepe' && !window.paymentConfirmed) {
          // Call our new Firebase Function to initiate the PhonePe payment
          const backendUrl = "/api/create-payment"; 
          
          const submitBtn = checkoutForm.querySelector('button[type="submit"]');
          const originalText = submitBtn.textContent;
          submitBtn.textContent = "Redirecting to Payment...";
          submitBtn.disabled = true;

          fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('firstName') + ' ' + formData.get('lastName'),
              phone: formData.get('phone'),
              amount: finalTotal * 100, // Amount is in paise
              address: formData.get('address'),
              giftMessage: formData.get('giftMessage') || '',
              orderInfo: orderDetails
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.redirectUrl) {
              // Redirect the user to PhonePe's official payment page
              window.location.href = data.redirectUrl;
            } else {
              alert("Payment Gateway Error: " + (data.message || "Unknown error"));
              submitBtn.textContent = originalText;
              submitBtn.disabled = false;
            }
          })
          .catch(err => {
            console.error("Backend Error:", err);
            alert("Error connecting to the secure payment server. Please ensure the backend is running, or use Direct UPI for now.");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          });
          
          return; // Pause the checkout submission process here
        }

        // Handle Direct UPI QR Modal Intercept
        if (paymentMethod === 'upi_qr' && !window.paymentConfirmed) {
          const modal = document.getElementById('qr-modal');
          if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modal-qr-price').textContent = `₹${finalTotal}`;
            
            // Handle UPI Intent for Mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const upiBtn = document.getElementById('upi-intent-link');
            if (isMobile && upiBtn) {
              upiBtn.style.display = 'flex';
              upiBtn.style.alignItems = 'center';
              upiBtn.style.justifyContent = 'center';
              upiBtn.style.gap = '0.5rem';
              const vpa = "Suravipickles@ybl"; 
              const name = "Suravi Pickles";
              // Added unique transaction reference (tr) which helps prevent security declines
              const trId = 'TXN' + Date.now();
              const upiHref = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&tr=${trId}&am=${finalTotal}&cu=INR&tn=Order%20Suravi%20Pickles`;
              upiBtn.href = upiHref;

              const appLinks = document.querySelectorAll('.upi-app-link');
              appLinks.forEach(link => {
                link.href = upiHref;
                link.style.cursor = 'pointer';
              });
            }

            // Start Timer
            let timeLeft = 300; 
            const timerEl = document.getElementById('modal-qr-timer');
            const expiredOverlay = document.getElementById('qr-expired-overlay');
            timerEl.textContent = "05:00"; 
            if(expiredOverlay) expiredOverlay.style.display = 'none';

            if (window.qrTimerInterval) clearInterval(window.qrTimerInterval);
            window.qrTimerInterval = setInterval(() => {
              timeLeft--;
              let m = Math.floor(timeLeft / 60);
              let s = timeLeft % 60;
              timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              if (timeLeft <= 0) {
                clearInterval(window.qrTimerInterval);
                timerEl.textContent = "00:00";
                if(expiredOverlay) expiredOverlay.style.display = 'flex';
              }
            }, 1000);

            // Cancel Button
            document.getElementById('cancel-qr-btn').onclick = (e) => {
              e.preventDefault();
              clearInterval(window.qrTimerInterval);
              modal.style.display = 'none';
            };

            // Confirm Payment Button
            document.getElementById('confirm-payment-btn').onclick = (e) => {
              e.preventDefault();
              clearInterval(window.qrTimerInterval);
              modal.style.display = 'none';
              window.paymentConfirmed = true; 
              // Programmatically re-trigger form submit to finalize the logic below
              checkoutForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            };
          }
          return; // Pause the checkout submission process here until confirmed
        }

        // Show loading state
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Placing Order...";
        submitBtn.disabled = true;

        // Send order notification to the real email address
        fetch("https://formsubmit.co/ajax/suravipickles@gmail.com", {
          method: "POST",
          headers: {
            'Accept': 'application/json'
          },
          body: formData
        })
          .then(response => response.json())
          .then(data => {
            const paymentMethod = formData.get('payment');
            
            if (paymentMethod === 'phonepe' || paymentMethod === 'upi_qr') {
              alert("Order details saved! To verify your payment, we will redirect you to WhatsApp.");
              
              // Format WhatsApp Message
              const fname = formData.get('firstName') || '';
              const lname = formData.get('lastName') || '';
              const customerPhone = formData.get('phone') || '';
              const address = formData.get('address') || '';
              const orderInfo = formData.get('Order_Details') || '';
              const orderType = formData.get('orderType') || 'self';
              const giftMessage = formData.get('giftMessage') || '';

              let paymentStatus = paymentMethod === 'phonepe' ? 
                `%0A*Payment Status:* Initiated via PhonePe Gateway` : 
                `%0A*Payment Status:* Paid via Direct UPI`;

              let giftInfo = "";
              if (orderType === 'gift') {
                giftInfo = `%0A%0A🎁 *GIFT ORDER*%0A*Message:* ${giftMessage}`;
              }
              
              const waMessage = `*New Order via Website!* 🛒%0A%0A*Name:* ${fname} ${lname}%0A*Phone:* ${customerPhone}%0A*Address:* ${address}${paymentStatus}${giftInfo}%0A%0A${encodeURIComponent(orderInfo)}`;
              
              // Open window to WhatsApp
              window.open(`https://wa.me/919494345715?text=${waMessage}`, '_blank');
            } else {
              alert("Order placed successfully via Cash on Delivery! We will contact you shortly to confirm your order.");
            }
            
            window.paymentConfirmed = false; // Reset state
            setTimeout(() => {
              window.location.href = "payment-success.html";
            }, 500);
          })
          .catch(error => {
            alert("Oops! There was a problem placing your order.");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            window.paymentConfirmed = false; // Reset state
          });
      });
    }
  }
}

// Initialize Cart
const cart = new CartManager();
window.cart = cart;
