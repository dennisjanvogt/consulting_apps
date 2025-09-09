class AuthManager {
  init() {
    this.setupAuthTabs();
    this.setupLoginForm();
    this.setupRegisterForm();
  }
  
  setupAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        // Show corresponding form
        if (targetTab === 'login') {
          document.getElementById('loginForm').classList.remove('hidden');
          document.getElementById('registerForm').classList.add('hidden');
        } else {
          document.getElementById('loginForm').classList.add('hidden');
          document.getElementById('registerForm').classList.remove('hidden');
        }
      });
    });
  }
  
  setupLoginForm() {
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const rememberMe = document.getElementById('rememberMe').checked;
      
      try {
        const response = await API.login(email, password);
        
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        window.app.currentUser = response.user;
        await window.app.showChatInterface();
      } catch (error) {
        errorEl.textContent = error.message || 'Login failed';
      }
    });
  }
  
  setupRegisterForm() {
    const form = document.getElementById('registerForm');
    const errorEl = document.getElementById('registerError');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      
      const username = document.getElementById('registerUsername').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validate
      if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        return;
      }
      
      if (password.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters';
        return;
      }
      
      try {
        const response = await API.register(email, password, username);
        
        window.app.currentUser = response.user;
        await window.app.showChatInterface();
      } catch (error) {
        errorEl.textContent = error.message || 'Registration failed';
      }
    });
  }
}

window.Auth = new AuthManager();