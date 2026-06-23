let currentCode = null;
let currentPlayer = null;

/* =========================
EMOJIS BLOQUEADOS
========================= */

const blockedEmojis = [
  "💩",
  "🖕",
  "🍆",
  "🍑",
  "🔞",
  "🍺",
  "🔫",
  "🚬"
];

/* =========================
TELAS
========================= */

function showScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {
      screen.classList.remove("active");
    });

  document
    .getElementById(id)
    .classList.add("active");
}

function showLoading() {

  document
    .getElementById("loading")
    .classList.remove("hidden");
}

function hideLoading() {

  document
    .getElementById("loading")
    .classList.add("hidden");
}

/* =========================
VERIFICAR CÓDIGO
========================= */

async function verifyCode() {

  const code =
    document
      .getElementById("codeInput")
      .value
      .trim()
      .toUpperCase();

  const errorBox =
    document.getElementById(
      "codeError"
    );

  errorBox.textContent = "";

  if (!code) {

    errorBox.textContent =
      "Digite um código.";

    return;
  }

  showLoading();

  const { data, error } =
    await client
      .from("player_codes")
      .select("*")
      .eq("code", code)
      .single();

  hideLoading();

  if (error || !data) {

    errorBox.textContent =
      "Código inválido.";

    return;
  }

  currentCode = code;

  if (data.used === false) {

    showScreen(
      "screen-register"
    );

    return;
  }

  const { data: player } =
    await client
      .from("players")
      .select("*")
      .eq("code", code)
      .single();

  currentPlayer = player;

  document
    .getElementById(
      "playerPreview"
    )
    .innerHTML = `
      <h2>
        ${player.emoji}
        ${player.name}
      </h2>

      <p>
        ${player.turma_area}
      </p>
    `;

  showScreen("screen-pin");
}

/* =========================
CADASTRO
========================= */

async function register() {

  const name =
    document
      .getElementById("nameInput")
      .value
      .trim();

  const emoji =
    document
      .getElementById("emojiInput")
      .value
      .trim();

  const type =
    document
      .getElementById("typeInput")
      .value;

  let turma =
    document
      .getElementById("turmaSelect")
      .value;

  if (turma === "OUTRO") {

    turma =
      document
        .getElementById(
          "otherAreaInput"
        )
        .value
        .trim();
  }

  const pin =
    document
      .getElementById("pinInput")
      .value
      .trim();

  if (
    !name ||
    !emoji ||
    !type ||
    !turma ||
    !pin
  ) {

    alert(
      "Preencha todos os campos."
    );

    return;
  }

  if (pin.length !== 4) {

    alert(
      "O PIN deve ter 4 números."
    );

    return;
  }

  showLoading();

  const { data, error } =
    await client
      .from("players")
      .insert([
        {
          code: currentCode,
          name,
          emoji,
          turma_area: turma,
          type,
          pin
        }
      ])
      .select()
      .single();

if (error) {

  hideLoading();

  console.error("ERRO SUPABASE:");
  console.error(error);

  alert(
    JSON.stringify(error)
  );

  return;
}

  await client
    .from("player_codes")
    .update({
      used: true
    })
    .eq(
      "code",
      currentCode
    );

  currentPlayer = data;

  hideLoading();

  document
    .getElementById(
      "playerPreview"
    )
    .innerHTML = `
      <h2>
        ${data.emoji}
        ${data.name}
      </h2>

      <p>
        ${data.turma_area}
      </p>
    `;

  showScreen("screen-pin");
}

/* =========================
LOGIN
========================= */

async function login() {

  const pin =
    document
      .getElementById("loginPin")
      .value;

  const errorBox =
    document
      .getElementById(
        "loginError"
      );

  errorBox.textContent = "";

  if (
    pin !== currentPlayer.pin
  ) {

    errorBox.textContent =
      "PIN inválido.";

    return;
  }

  localStorage.setItem(
    "player",
    JSON.stringify(
      currentPlayer
    )
  );

  window.location.href =
    "album/album.html";
}

/* =========================
CARREGAR TURMAS
========================= */

async function loadAreas() {

  const type =
    document
      .getElementById(
        "typeInput"
      )
      .value;

  const select =
    document
      .getElementById(
        "turmaSelect"
      );

  select.innerHTML =
    "<option>Carregando...</option>";

  const { data } =
    await client
      .from("groups")
      .select("*")
      .eq("type", type)
      .eq("active", true)
      .order("name");

  select.innerHTML =
    "<option value=''>Selecione</option>";

  data.forEach(item => {

    select.innerHTML += `
      <option value="${item.name}">
        ${item.name}
      </option>
    `;
  });

  select.innerHTML += `
    <option value="OUTRO">
      ✏️ Minha turma/setor não está na lista
    </option>
  `;
}

/* =========================
OUTRO
========================= */

document
  .getElementById(
    "turmaSelect"
  )
  .addEventListener(
    "change",
    () => {

      const value =
        document
          .getElementById(
            "turmaSelect"
          )
          .value;

      document
        .getElementById(
          "otherAreaInput"
        )
        .style.display =
        value === "OUTRO"
          ? "block"
          : "none";
    }
  );

/* =========================
EMOJI
========================= */

const emojiInput =
  document.getElementById(
    "emojiInput"
  );

emojiInput.addEventListener(
  "input",
  () => {

    const value =
      emojiInput.value;

    const emojiRegex =
      /\p{Extended_Pictographic}/gu;

    const emojis =
      value.match(
        emojiRegex
      );

    const emoji =
      emojis
        ? emojis[0]
        : "";

    if (
      blockedEmojis.includes(
        emoji
      )
    ) {

      alert(
        "Escolha outro avatar."
      );

      emojiInput.value = "";

      return;
    }

    emojiInput.value =
      emoji;
  }
);

/* =========================
PIN NUMÉRICO
========================= */

const pinInput =
  document.getElementById(
    "pinInput"
  );

pinInput.addEventListener(
  "input",
  () => {

    pinInput.value =
      pinInput.value
        .replace(/\D/g, "")
        .slice(0, 4);
  }
);

/* =========================
EXPORTS
========================= */

window.verifyCode =
  verifyCode;

window.register =
  register;

window.login =
  login;

window.loadAreas =
  loadAreas;

const howTextContent = `
A Seleção dos Bastidores é um jogo onde você descobre profissões reais por trás de grandes eventos como a Copa do Mundo.

Cada figurinha representa uma profissão que ajuda a construir não só o evento no país sede, mas também tudo o que acontece ao redor dele, como transmissões, comemorações, viagens e experiências do público.

---

🎯 Objetivo

Descobrir, colecionar e completar o máximo de profissões diferentes.

---

📦 Como funciona o jogo

Todos os dias você recebe:

3 pacotes de figurinhas
Cada pacote contém 4 figurinhas aleatórias

As figurinhas representam profissionais de diversas áreas.

---

⭐ Tipos de figurinhas

⭐ Brilhante
Rara, aparece com aproximadamente 10% de chance
Vale mais pontos

📖 Única
Primeira vez que você encontra aquela figurinha

🔁 Repetida
Já encontrada antes, mas ainda útil para trocas

---

🏆 Rankings

Você pode competir de várias formas:

👕 Camisa 10
Maior pontuação total

📚 Artilheiros das Figurinhas
Maior quantidade total de figurinhas coletadas

⭐ Caçadores de Estrelas
Maior quantidade de figurinhas brilhantes

👥 Amigos da Torcida
Maior número de amigos no jogo

🔄 Mestres das Substituições
Maior número de trocas realizadas

---

🏫 Competição de grupos

🏫 Taça das Turmas
Vence quem tiver maior completude de álbum (mais figurinhas diferentes descobertas)

👔 Taça dos Funcionários
Vence a área com maior completude de álbum

---

🔄 Trocas e interação

Você pode trocar figurinhas com outros jogadores usando código ou QR Code.

---

🎯 Missões

Missões diárias liberam recompensas extras.

---

🌍 Mensagem do jogo

A Seleção dos Bastidores mostra que grandes eventos são feitos por muitas profissões diferentes.

Cada figurinha é uma peça desse sistema.

---

❓ Será que a profissão que você procura está escondida em algum pacote?

---

Um projeto EMED Senac Aclimação

Desenvolvido por Emerson Brito e Camila Catalado 🧑‍🏫
Ilustrado por MULTI4 e MULTI5 🎨



`;

function openHowItWorks() {
    document.getElementById("howModal").classList.remove("hidden");
    document.getElementById("howText").innerText = howTextContent;
}

function closeHowItWorks() {
    document.getElementById("howModal").classList.add("hidden");
}