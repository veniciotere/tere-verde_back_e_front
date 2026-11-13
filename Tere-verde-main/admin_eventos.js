// --- LÓGICA DE SALVAR ---
// Validação de horários: impedir digitação inválida
document.getElementById('horario').addEventListener('input', function() {
    const value = this.value;
    if (value && (value < '00:00' || value > '23:59')) {
        alert("❌ Horário inválido. Deve estar entre 00:00 e 23:59.");
        this.value = '';
    }
});

document.getElementById('horarioTer').addEventListener('input', function() {
    const value = this.value;
    if (value && (value < '00:00' || value > '23:59')) {
        alert("❌ Horário inválido. Deve estar entre 00:00 e 23:59.");
        this.value = '';
    }
});


document.getElementById('formEvento').addEventListener('submit', async function(e) {
    e.preventDefault();

    const dataInicio = document.getElementById('data').value;
    const dataTermino = document.getElementById('dataTer').value;
    const horarioInicio = document.getElementById('horario').value;
    const horarioTermino = document.getElementById('horarioTer').value;

    if (dataInicio > dataTermino) {
        alert("❌ A data de início não pode ser posterior à data de término.");
        return;
    }

    if (dataInicio === dataTermino && horarioInicio > horarioTermino) {
        alert("❌ O horário de início não pode ser posterior ao horário de término no mesmo dia.");
        return;
    }

    const mapaParques = {
        Serra_dos_Orgaos: 1,
        Tres_Picos: 2,
        Montanhas_Teresopolis: 3
    };

    const novoEvento = {
        park_id: mapaParques[document.getElementById('local').value],
        nome: document.getElementById('nome').value.trim(),
        data_inicio: dataInicio,
        data_fim: dataTermino,
        horario_inicio: horarioInicio,
        horario_fim: horarioTermino,
        descricao: document.getElementById('descricao').value.trim()
    };

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3000/api/v1/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(novoEvento)
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || "Erro ao cadastrar evento.");
        }

        alert("✅ Evento cadastrado com sucesso no Back-End!");
        this.reset();

    } catch (error) {
        console.error("Erro ao cadastrar evento:", error);
        alert(error.message);
    }
});


// --- LÓGICA DO MODAL (TELA FLUTUANTE) ---
const modal = document.getElementById("modalEdicao");
const btnAbrir = document.getElementById("btnAbrirEdicao");
const spanFechar = document.getElementsByClassName("fechar")[0];
const listaEdicao = document.getElementById("listaEdicao");

// Abrir Modal e Carregar Lista
btnAbrir.onclick = function() {
    modal.style.display = "block";
    renderizarListaEdicao();
}

// Fechar Modal
spanFechar.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

async function renderizarListaEdicao() {
    const token = sessionStorage.getItem('token');

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    try {
        const resposta = await fetch(
            'http://localhost:3000/api/v1/events/admin/listar',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const lista = await resposta.json();

        if (!resposta.ok) {
            throw new Error(lista.erro || "Erro ao carregar eventos.");
        }

        listaEdicao.innerHTML = "";

        if (lista.length === 0) {
            listaEdicao.innerHTML = "<p>Nenhum evento cadastrado.</p>";
            return;
        }

        lista.forEach(evento => {
            const div = document.createElement('div');
            div.className = 'item-gerencia';

            const texto = document.createElement('span');
            texto.textContent =
                `${evento.nome} (${evento.data}) — ${evento.visivel ? 'Visível' : 'Oculto'}`;

            div.appendChild(texto);
const btnVisibilidade = document.createElement('button');

btnVisibilidade.textContent = evento.visivel ? 'Ocultar' : 'Publicar';
btnVisibilidade.className = 'btn-visibilidade';

btnVisibilidade.addEventListener('click', () => {
    alterarVisibilidade(evento.id, !evento.visivel);
});

div.appendChild(btnVisibilidade);
const btnExcluir = document.createElement('button');
btnExcluir.textContent = 'Excluir';
btnExcluir.className = 'btn-excluir';

btnExcluir.addEventListener('click', () => excluirEvento(evento.id));

div.appendChild(btnExcluir);
listaEdicao.appendChild(div);
        });

    } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        listaEdicao.innerHTML = "<p>Não foi possível carregar os eventos.</p>";
        alert(error.message);
    }
}


// --- EXCLUIR EVENTO ---
async function excluirEvento(id) {
    const confirmar = confirm("Tem certeza de que deseja excluir este evento?");

    if (!confirmar) {
        return;
    }

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    try {
        const resposta = await fetch(
            `http://localhost:3000/api/v1/events/${id}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao excluir evento.");
        }

        alert("Evento excluído com sucesso!");

        renderizarListaEdicao();

    } catch (error) {
        console.error("Erro ao excluir evento:", error);
        alert(error.message);
    }
}
// --- ALTERAR VISIBILIDADE DO EVENTO ---
async function alterarVisibilidade(id, visivel) {
    const token = sessionStorage.getItem('token');

    if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    try {
        const resposta = await fetch(
            `http://localhost:3000/api/v1/events/${id}/visibilidade`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ visivel })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao alterar visibilidade.");
        }

        alert(visivel
            ? "Evento publicado com sucesso!"
            : "Evento ocultado com sucesso!"
        );

        renderizarListaEdicao();

    } catch (error) {
        console.error("Erro ao alterar visibilidade:", error);
        alert(error.message);
    }
}