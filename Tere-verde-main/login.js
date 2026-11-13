
const usuarioInput = document.getElementById('usuario');
const senhaInput = document.getElementById('senha');
const botaoLogin = document.getElementById('botaoLogin');

const API_URL = 'http://localhost:3000/api/v1/auth/login';

function mostrarMensagem(texto, tipo) {
    let mensagem = document.getElementById('loginMessage');

    if (!mensagem) {
        mensagem = document.createElement('div');
        mensagem.id = 'loginMessage';
        mensagem.classList.add('mensagem-estilizada');
        botaoLogin.parentNode.insertBefore(mensagem, botaoLogin.nextSibling);
    }

    mensagem.textContent = texto;

    if (tipo === 'erro') {
        mensagem.classList.add('mensagem-erro');
        mensagem.classList.remove('mensagem-sucesso');
    } else {
        mensagem.classList.add('mensagem-sucesso');
        mensagem.classList.remove('mensagem-erro');
    }
}

botaoLogin.addEventListener('click', async function (event) {
    event.preventDefault();

    const email = usuarioInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        mostrarMensagem('E-mail ou senha não informado.', 'erro');
        return;
    }

    try {
        botaoLogin.disabled = true;

        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'E-mail ou senha inválidos.');
        }

        sessionStorage.setItem('token', dados.token);
        sessionStorage.setItem('administrador', JSON.stringify(dados.administrador));

        mostrarMensagem('Login bem-sucedido!', 'sucesso');

        window.location.href = 'admin_eventos.html';

    } catch (error) {
        mostrarMensagem(error.message || 'Não foi possível conectar ao servidor.', 'erro');
    } finally {
        botaoLogin.disabled = false;
    }
});
