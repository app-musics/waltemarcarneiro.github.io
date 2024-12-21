class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.setupAuthUI();
        this.setupAuthListeners();
    }

    setupAuthUI() {
        const modal = document.getElementById('authModal');
        const loginBtn = document.getElementById('loginBtn');
        const closeBtn = document.querySelector('.close');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const emailAuthForm = document.getElementById('emailAuthForm');
        const registerLink = document.getElementById('registerLink');

        loginBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        googleLoginBtn.addEventListener('click', () => this.signInWithGoogle());
        emailAuthForm.addEventListener('submit', (e) => this.handleEmailAuth(e));
        registerLink.addEventListener('click', (e) => this.toggleAuthMode(e));
    }

    setupAuthListeners() {
        this.auth.onAuthStateChanged(user => {
            const userArea = document.getElementById('userArea');
            if (user) {
                userArea.innerHTML = `
                    <div class="user-profile">
                        <img src="${user.photoURL || 'default-avatar.png'}" alt="Avatar">
                        <span>${user.displayName || user.email}</span>
                        <button id="logoutBtn">
                            <span class="material-icons">logout</span>
                        </button>
                    </div>
                `;
                document.getElementById('logoutBtn').addEventListener('click', () => this.signOut());
                document.getElementById('authModal').style.display = 'none';
            } else {
                userArea.innerHTML = `
                    <button id="loginBtn" class="login-btn">
                        <span class="material-icons">account_circle</span>
                        Entrar
                    </button>
                `;
                document.getElementById('loginBtn').addEventListener('click', () => {
                    document.getElementById('authModal').style.display = 'block';
                });
            }
        });
    }

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Erro no login com Google:', error);
            alert('Erro ao fazer login com Google. Tente novamente.');
        }
    }

    async handleEmailAuth(e) {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const isRegistering = e.target.classList.contains('register-mode');

        try {
            if (isRegistering) {
                await this.auth.createUserWithEmailAndPassword(email, password);
            } else {
                await this.auth.signInWithEmailAndPassword(email, password);
            }
        } catch (error) {
            console.error('Erro na autenticação por email:', error);
            alert(error.message);
        }
    }

    toggleAuthMode(e) {
        e.preventDefault();
        const form = document.getElementById('emailAuthForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const registerLink = document.getElementById('registerLink');

        if (form.classList.contains('register-mode')) {
            form.classList.remove('register-mode');
            submitBtn.textContent = 'Entrar com Email';
            registerLink.textContent = 'Não tem uma conta? Cadastre-se';
        } else {
            form.classList.add('register-mode');
            submitBtn.textContent = 'Cadastrar';
            registerLink.textContent = 'Já tem uma conta? Entre';
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            alert('Erro ao fazer logout. Tente novamente.');
        }
    }
}

// Initialize auth manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
});
