// Arquivo: codigo/public/modulos/login/login.js
// Módulo de autenticação e sessão para a aplicação VanConnect.

const Auth = {
    // Endereços da aplicação
    API_BASE_URL: 'http://localhost:3000',
    LOGIN_PAGE: '/modulos/login/login.html',
    DEFAULT_REDIRECT_PAGE: '/index.html',
    DRIVER_DASHBOARD: '/modulos/areaMotorista/areaMotorista.html',
    ADMIN_DASHBOARD: '/modulos/admin/admin.html',

    /**
     * Salva os dados do usuário na sessão do navegador.
     */
    _saveSession: function (userData) {
        // Remove a senha antes de salvar na sessão por segurança
        const { senha, ...userToStore } = userData;
        sessionStorage.setItem('usuarioCorrente', JSON.stringify(userToStore));
    },

    /**
     * Realiza o login do usuário.
     */
    login: async function (login, senha) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/usuarios?login=${login}&senha=${senha}`);
            if (!response.ok) throw new Error('Falha na comunicação com o servidor.');
            const data = await response.json();
            if (data.length === 1) {
                this._saveSession(data[0]);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro durante o login:', error);
            return false;
        }
    },

    /**
     * Realiza o logout do usuário.
     */
    logout: function () {
        sessionStorage.clear();
        window.location.href = this.DEFAULT_REDIRECT_PAGE;
    },

    /**
     * Registra um novo usuário (passageiro/responsável).
     */
    register: async function (nome, login, senha, email, celular) {
        const newUser = { nome, login, senha, email, celular, role: 'parent' };
        try {
            const response = await fetch(`${this.API_BASE_URL}/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            return response.ok;
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            return false;
        }
    },

    /**
     * Registra um novo motorista e seu veículo.
     */
    registerDriver: async function (driverData) {
        const driverProfile = {
            name: driverData.nome,
            contactEmail: driverData.email,
            phone: driverData.phone,
            status: "Ativo",
            photoUrl: ""
        };

        try {
            const driverResponse = await fetch(`${this.API_BASE_URL}/drivers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(driverProfile)
            });
            if (!driverResponse.ok) throw new Error("Falha ao criar o perfil do motorista.");

            const savedDriver = await driverResponse.json();

            const capacity = parseInt(driverData.vehicleCapacity, 10);
            const vehicleData = {
                driverId: savedDriver.id,
                model: driverData.vehicleModel,
                plate: driverData.vehiclePlate,
                capacity: capacity,
                availableSpots: capacity
            };
            await fetch(`${this.API_BASE_URL}/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleData)
            });

            const userAccount = {
                nome: driverData.nome,
                email: driverData.email,
                login: driverData.login,
                senha: driverData.senha,
                role: 'driver',
                driverId: savedDriver.id
            };

            const userResponse = await fetch(`${this.API_BASE_URL}/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userAccount)
            });
            if (!userResponse.ok) throw new Error("Falha ao criar a conta de usuário.");

            return true;
        } catch (error) {
            console.error('Erro durante o cadastro do motorista:', error);
            return false;
        }
    },

    isAuthenticated: function () {
        return sessionStorage.getItem('usuarioCorrente') !== null;
    },

    getCurrentUser: function () {
        return JSON.parse(sessionStorage.getItem('usuarioCorrente'));
    },

    protectPage: function () {
        if (!this.isAuthenticated()) {
            sessionStorage.setItem('redirectURL', window.location.pathname + window.location.search);
            window.location.href = this.LOGIN_PAGE;
        }
    },

    redirectAfterLogin: function () {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = this.LOGIN_PAGE;
            return;
        }
        if (user.role === 'driver') {
            window.location.href = this.DRIVER_DASHBOARD;
        } else if (user.role === 'admin') {
            window.location.href = this.ADMIN_DASHBOARD;
        } else {
            const redirectURL = sessionStorage.getItem('redirectURL');
            sessionStorage.removeItem('redirectURL');
            window.location.href = redirectURL || this.DEFAULT_REDIRECT_PAGE;
        }
    },

    /**
     * [VERSÃO FINAL] Monta o cabeçalho dinamicamente com base no perfil do usuário.
     * Busca os links de navegação do db.json.
     * Lida com o menu principal e com cabeçalhos simplificados (como o do admin).
     * @param {string} containerId - ID do elemento que conterá os links ou a autenticação.
     */
    setupHeader: async function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const user = this.getCurrentUser();
        const userRole = user ? user.role : 'guest'; // Define o perfil como 'guest' se não estiver logado

        try {
            // Busca o objeto de navegação completo do db.json
            const response = await fetch(`${this.API_BASE_URL}/navigation`);
            const navigationData = await response.json();

            // Pega a lista de links para o perfil do usuário atual
            const links = navigationData[userRole] || navigationData['guest'];

            // Gera o HTML para os links de navegação
            const linksHtml = links.map(link => `<li><a href="${link.href}">${link.text}</a></li>`).join('');

            let authHtml = '';
            if (user) {
                // Se o usuário está logado, monta a saudação e o botão de logout
                authHtml = `
                    <li class="nav-user-info">
                        <span class="navbar-text">Olá, ${user.nome.split(' ')[0]}</span>
                        <a href="#" id="logout-link" class="nav-button-logout" title="Sair">Sair</a>
                    </li>
                `;
            } else {
                // Se não está logado, monta o botão de login/registro
                authHtml = `
                    <li>
                        <a href="${window.location.origin}${this.LOGIN_PAGE}" class="nav-button login-button">Login / Registrar</a>
                    </li>
                `;
            }

            // Verifica se o container é a UL principal ou um container só de autenticação
            if (container.tagName === 'UL') {
                // Se for a lista <ul>, insere os links do menu E a autenticação
                container.innerHTML = linksHtml + authHtml;
            } else {
                // Se for outro elemento (como a <div> do admin), insere APENAS a autenticação
                container.innerHTML = authHtml;
            }

            // Adiciona o evento de clique para o botão de logout, se ele existir
            if (user) {
                // É preciso buscar o elemento novamente pois ele foi inserido dinamicamente
                const logoutLink = document.getElementById('logout-link');
                if (logoutLink) {
                    logoutLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.logout();
                    });
                }
            }

        } catch (error) {
            console.error('Falha ao montar o cabeçalho:', error);
            container.innerHTML = '<li><a href="/index.html">Início</a></li><li><span style="color:red;">Menu indisponível</span></li>';
        }
    }
};