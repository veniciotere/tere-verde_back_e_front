// Dados das atividades
// Endereço da API
const API_URL = 'http://localhost:3000/api/v1/activities';

// Dados carregados da API
let atividades = [];

// Busca as atividades no Back-End
async function carregarAtividades() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error('Erro ao buscar atividades.');
        }

        atividades = await resposta.json();

        renderAtividades(atividades);

    } catch (erro) {
        console.error('Erro ao carregar atividades:', erro);

        document.getElementById('conteudoAtividades').innerHTML = `
            <div class="mensagem-vazia">
                <p>Não foi possível carregar as atividades.</p>
            </div>
        `;
    }
}

// Função para renderizar as atividades
function renderAtividades(atividadesExibir) {

    const container = document.getElementById('conteudoAtividades');

    container.innerHTML = '';

    if (atividadesExibir.length === 0) {

        container.innerHTML = `
            <div class="mensagem-vazia">
                <p>⚠️ Atividade não localizada.</p>
            </div>
        `;

        return;
    }

    atividadesExibir.forEach(atividade => {

        const card = document.createElement('div');

        card.className = 'atividadeCard';

        card.innerHTML = `
            <p class="parqueNome">${atividade.parque}</p>

            <h2>${atividade.nome}</h2>

            <div class="infoQuadrado">
                <div class="quadrado">
                    Distância: ${atividade.distancia}
                </div>

                <div class="quadrado">
                    Tempo: ${atividade.tempo}
                </div>

                <div class="quadrado">
                    Disponibilidade: ${atividade.disponibilidade}
                </div>

                <div class="quadrado">
                    Dificuldade: ${atividade.dificuldade}
                </div>

                <div class="quadrado">
                    Tipo: ${atividade.tipo}
                </div>
            </div>

            <div class="campoInformacao">
                ${atividade.descricao}
            </div>

            <img
                class="imagemCaixa"
                src="${atividade.imagens || ''}"
                alt="${atividade.nome}"
            >
        `;

        container.appendChild(card);
    });
}

// Função que aplica os filtros
function aplicarFiltros() {

    const parqueSelecionado =
        document.getElementById('filtroParque').value;

    const dificuldadeSelecionada =
        document.getElementById('filtroDificuldade').value;

    const tipoSelecionado =
        document.getElementById('filtroTipo').value;

    const atividadesFiltradas = atividades.filter(atividade => {

        // Verifica o parque
        const filtroParqueOk =
            parqueSelecionado === "Todos" ||
            atividade.parque === parqueSelecionado;

        // Verifica dificuldade
        const diffAtividade =
            atividade.dificuldade.toLowerCase();

        const diffFiltro =
            dificuldadeSelecionada.toLowerCase();

        const filtroDificuldadeOk =
            diffFiltro === "todos" ||
            diffAtividade === diffFiltro;

        // Verifica tipo
        const tipoAtividade =
            atividade.tipo.toLowerCase();

        const tipoFiltro =
            tipoSelecionado.toLowerCase();

        const filtroTipoOk =
            tipoFiltro === "todos" ||
            tipoAtividade === tipoFiltro;

        return (
            filtroParqueOk &&
            filtroDificuldadeOk &&
            filtroTipoOk
        );
    });

    renderAtividades(atividadesFiltradas);
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {

    // Renderiza tudo ao carregar
    carregarAtividades();

    // Eventos dos filtros
    document
        .getElementById('filtroParque')
        .addEventListener('change', aplicarFiltros);

    document
        .getElementById('filtroDificuldade')
        .addEventListener('change', aplicarFiltros);

    document
        .getElementById('filtroTipo')
        .addEventListener('change', aplicarFiltros);
});