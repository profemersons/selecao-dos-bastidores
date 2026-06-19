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

    console.log(error);

    alert(
      "Erro ao criar conta."
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