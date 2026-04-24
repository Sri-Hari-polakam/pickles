// Robust Initialization
const initApp = () => {
  console.log("Suravi App: Initializing...");

  // Mobile Menu Toggle
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Active Link State Setup
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.nav-links a');
  navItems.forEach(item => {
    if (item.getAttribute('href') === currentPath) {
      item.classList.add('active');
    }
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach((elem) => {
    observer.observe(elem);
  });

  // Product Filtering Logic
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');

        productCards.forEach(card => {
          if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
            card.style.display = 'flex';
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'scale(1)';
            }, 10);
          } else {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
              card.style.display = 'none';
            }, 300);
          }
        });
      });
    });
  }

  // --- ADD TO CART LOGIC ---
  function updateCartCountUI() {
    try {
      const cartItems = JSON.parse(localStorage.getItem('suravi_pickles_cart') || '[]');
      const total = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const counters = document.querySelectorAll('.cart-count');
      console.log("Suravi App: Updating cart count to", total);
      counters.forEach(counter => {
        counter.textContent = total;
        counter.style.display = total > 0 ? 'flex' : 'none';
      });
    } catch (e) {
      console.error("Suravi App: Error updating cart count:", e);
    }
  }

  // Initial count update
  updateCartCountUI();

  // Delegation on document to ensure it works even if content is dynamic
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (btn) {
      console.log("Suravi App: Add to Cart clicked!", btn.dataset.name);
      e.preventDefault();
      e.stopPropagation();

      const id = btn.getAttribute('data-id');
      let name = btn.getAttribute('data-name');
      let price = parseFloat(btn.getAttribute('data-price'));
      const image = btn.getAttribute('data-image');

      // Handle dynamic size selection
      const card = btn.closest('.product-card');
      if (card) {
        const sizeSelect = card.querySelector('.size-select');
        if (sizeSelect) {
          price = parseFloat(sizeSelect.value);
          const sizeLabel = sizeSelect.options[sizeSelect.selectedIndex].text;
          name = `${name} (${sizeLabel})`;
        }
      }

      if (isNaN(price)) {
        console.error("Suravi App: Invalid price for", name);
        return;
      }

      try {
        let cartItems = JSON.parse(localStorage.getItem('suravi_pickles_cart') || '[]');
        const existingItem = cartItems.find(item => item.id === id && item.name === name);

        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          cartItems.push({ id, name, price, image, quantity: 1 });
        }

        localStorage.setItem('suravi_pickles_cart', JSON.stringify(cartItems));
        updateCartCountUI();
        
        // Show success feedback
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Added!';
        btn.style.backgroundColor = '#28a745';
        btn.style.color = 'white';
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }, 1500);

        // Fallback for visual confirmation
        console.log("Suravi App: Successfully added to cart");
      } catch (err) {
        console.error("Suravi App: Cart error:", err);
      }
    }
  });

  // --- PLACE ORDER BUTTON LOGIC (FOR CHECKOUT PAGE) ---
  const placeOrderBtn = document.getElementById('place-order-btn');
  const checkoutForm = document.getElementById('checkout-form');

  if (placeOrderBtn && checkoutForm) {
    placeOrderBtn.addEventListener('click', async () => {
      const formData = new FormData(checkoutForm);
      const paymentMethod = formData.get('payment');
      
      if (paymentMethod === 'phonepe') {
        console.log("Suravi App: Initiating PhonePe payment flow...");
        try {
          // 1. Save to Firestore if ready
          // Order saving is now handled on the payment-success page as per requirements
          console.log("Suravi App: Proceeding to payment gateway...");

          // 2. Call Backend for Redirect
          const response = await fetch('https://pickles-production-d378.up.railway.app/pay');
          const data = await response.json();
          
          let targetUrl = data.paymentUrl;
          const fallbackUrl = 'https://suravipickles.vercel.app/payment-success';
          
          // Requirement: Ignore any paymentUrl that contains "example.com"
          // Requirement: Force redirect to: https://suravipickles.vercel.app/payment-success
          if (!targetUrl || targetUrl.includes('example.com')) {
            targetUrl = fallbackUrl;
          } else if (!targetUrl.startsWith('http') && !targetUrl.startsWith('//')) {
            // Ensure protocol for URLs like "suravipickles.vercel.app/..."
            targetUrl = 'https://' + targetUrl;
          }
          
          window.location.href = targetUrl;
        } catch (error) {
          console.error("Suravi App: Payment process error:", error);
          // Requirement: Do NOT show any error messages, and ensure redirect to success
          window.location.href = 'https://suravipickles.vercel.app/payment-success';
        }
      } else {
        // Direct UPI or other - trigger original form logic
        console.log("Suravi App: Direct UPI selected, triggering form submit...");
        checkoutForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });
  }
};

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
