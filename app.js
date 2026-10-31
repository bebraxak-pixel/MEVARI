// MEVARI BETA 1.0

// ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const target = document.getElementById(screenId);

    if (target) {
        target.classList.add("active");
    }
}

// ПОЛУЧЕНИЕ SUPABASE
function getClient() {
    if (typeof supabaseClient === "undefined") {
        console.error("Supabase не подключён");
        return null;
    }

    return supabaseClient;
}

// ЗАСТАВКА
window.addEventListener("load", () => {
    setTimeout(() => {
        showScreen("welcome");
    }, 3500);
});

// ПОКАЗ СООБЩЕНИЙ
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = message;
    }
}

// СОЗДАНИЕ ПРОФИЛЯ
async function ensureProfile(user) {
    const client = getClient();

    if (!client || !user) return false;

    const metadata = user.user_metadata || {};

    const username = metadata.username;
    const displayName = metadata.display_name;

    if (!username || !displayName) {
        console.error("Данные профиля не найдены");
        return false;
    }

    const { data: existingProfile, error: selectError } =
        await client
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

    if (selectError) {
        console.error(selectError);
        return false;
    }

    if (existingProfile) return true;

    const { error: insertError } = await client
        .from("profiles")
        .insert({
            id: user.id,
            username: username,
            display_name: displayName
        });

    if (insertError) {
        console.error(insertError);
        return false;
    }

    return true;
}

// РЕГИСТРАЦИЯ
async function register() {
    const client = getClient();

    if (!client) {
        showMessage("registerMessage", "Ошибка подключения Supabase");
        return;
    }

    const name = document.getElementById("registerName").value.trim();
    const nickname = document.getElementById("registerNickname").value
        .trim()
        .toLowerCase();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !nickname || !email || !password) {
        showMessage("registerMessage", "Заполни все поля ✦");
        return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(nickname)) {
        showMessage(
            "registerMessage",
            "Никнейм: 3–20 символов, латиница, цифры или _"
        );
        return;
    }

    if (password.length < 8) {
        showMessage(
            "registerMessage",
            "Пароль должен содержать минимум 8 символов"
        );
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage("registerMessage", "Проверь электронную почту");
        return;
    }

    showMessage("registerMessage", "Создаём аккаунт... ✦");

    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: nickname,
                display_name: name
            }
        }
    });

    if (error) {
        showMessage("registerMessage", error.message);
        return;
    }

    if (data.session && data.user) {
        const profileCreated = await ensureProfile(data.user);

        if (!profileCreated) {
            showMessage(
                "registerMessage",
                "Аккаунт создан, но профиль не сохранился. Сообщи мне об этом."
            );
            return;
        }

        showMessage("registerMessage", "Добро пожаловать в MEVARI! ✨");
        showScreen("home");
    } else {
        showMessage(
            "registerMessage",
            "Аккаунт создан! Проверь почту и подтверди регистрацию ✉"
        );
    }
}

// ВХОД
async function login() {
    const client = getClient();

    if (!client) {
        showMessage("loginMessage", "Ошибка подключения Supabase");
        return;
    }

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        showMessage("loginMessage", "Заполни почту и пароль ✦");
        return;
    }

    showMessage("loginMessage", "Входим в аккаунт...");

    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        showMessage("loginMessage", "Не удалось войти. Проверь почту и пароль.");
        return;
    }

    const profileCreated = await ensureProfile(data.user);

    if (!profileCreated) {
        showMessage(
            "loginMessage",
            "Не удалось загрузить профиль. Проверь настройки Supabase."
        );
        return;
    }

    showMessage("loginMessage", "С возвращением! 💜");
    showScreen("home");
}

// ПОИСК ПОЛЬЗОВАТЕЛЕЙ
async function searchUsers() {
    const client = getClient();

    const input = document.getElementById("userSearch");
    const results = document.getElementById("searchResults");

    if (!input || !results) return;

    const query = input.value.trim().toLowerCase();

    results.innerHTML = "";

    if (!query) return;

    if (!client) {
        results.textContent = "Поиск пока недоступен ✦";
        return;
    }

    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData.session) {
        results.textContent = "Войди в аккаунт для поиска ✦";
        return;
    }

    const { data, error } = await client
        .from("profiles")
        .select("username, display_name")
        .ilike("username", `%${query}%`)
        .limit(20);

    if (error) {
        results.textContent = "Не удалось выполнить поиск";
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        results.textContent = "Пользователи не найдены ✦";
        return;
    }

    data.forEach(user => {
        const item = document.createElement("div");
        item.className = "search-result";

        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.textContent = "🌙";

        const info = document.createElement("span");

        const name = document.createElement("strong");
        name.textContent = user.display_name;

        const nickname = document.createElement("small");
        nickname.textContent = "@" + user.username;

        info.appendChild(name);
        info.appendChild(nickname);

        item.appendChild(avatar);
        item.appendChild(info);

        results.appendChild(item);
    });
}

// ДЕМО-ОТПРАВКА СООБЩЕНИЙ
function sendMessage() {
    const input = document.getElementById("messageText");

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    const messages = document.querySelector(".chat-messages");

    if (!messages) return;

    const message = document.createElement("div");
    message.className = "message sent";
    message.textContent = text;

    messages.appendChild(message);

    input.value = "";
    messages.scrollTop = messages.scrollHeight;
}

// ВЫХОД
async function logout() {
    const client = getClient();

    if (client) {
        const { error } = await client.auth.signOut();

        if (error) {
            console.error(error);
        }
    }

    showScreen("welcome");
}

console.log("MEVARI BETA 1.0 loaded ✦");
// ПРОФИЛЬ НАЙДЕННОГО ПОЛЬЗОВАТЕЛЯ

document.addEventListener("click", async function(event) {
    const contact = event.target.closest(
        "#searchResults .search-result"
    );

    if (!contact) return;

    const nickname = contact.querySelector("small")
        ?.textContent.replace("@", "").trim();

    if (!nickname) return;

    const client = getClient();

    if (!client) return;

    const { data: user, error } = await client
        .from("profiles")
        .select("username, display_name")
        .eq("username", nickname)
        .single();

    if (error || !user) {
        alert("Не удалось открыть профиль ✦");
        return;
    }

    let profile = document.getElementById("contactProfile");

    if (!profile) {
        profile = document.createElement("section");
        profile.id = "contactProfile";
        profile.className = "screen";
        document.body.appendChild(profile);
    }

    profile.innerHTML = "";

    const card = document.createElement("div");
    card.className = "glass-card";

    const avatar = document.createElement("div");
    avatar.textContent = "🌙";
    avatar.style.fontSize = "64px";
    avatar.style.textAlign = "center";

    const name = document.createElement("h1");
    name.textContent = user.display_name;

    const username = document.createElement("p");
    username.textContent = "@" + user.username;
    username.style.textAlign = "center";

    const writeButton = document.createElement("button");
    writeButton.textContent = "Написать";

    writeButton.onclick = function() {
        showScreen("chat");
    };

    const backButton = document.createElement("button");
    backButton.className = "secondary";
    backButton.textContent = "Назад";

    backButton.onclick = function() {
        showScreen("home");
    };

    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(username);
    card.appendChild(writeButton);
    card.appendChild(backButton);

    profile.appendChild(card);

    showScreen("contactProfile");
});
// MEVARI — ЛИЧНЫЕ ЧАТЫ

let activeConversationId = null;

// ОТКРЫТИЕ ЛИЧНОГО ЧАТА
async function openPrivateChat(username) {
    const client = getClient();

    if (!client) return;

    const { data: sessionData } = await client.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
        alert("Сначала войди в аккаунт ✦");
        return;
    }

    const { data: contact, error: contactError } = await client
        .from("profiles")
        .select("id, username, display_name")
        .eq("username", username)
        .single();

    if (contactError || !contact) {
        alert("Пользователь не найден");
        return;
    }

    if (contact.id === currentUser.id) {
        alert("Это твой собственный профиль ✦");
        return;
    }

    const user1 = currentUser.id < contact.id
        ? currentUser.id : contact.id;

    const user2 = currentUser.id < contact.id
        ? contact.id : currentUser.id;

    let { data: conversation, error } = await client
        .from("conversations")
        .select("id")
        .eq("user1", user1)
        .eq("user2", user2)
        .maybeSingle();

    if (error) {
        alert("Не удалось открыть переписку");
        console.error(error);
        return;
    }

    if (!conversation) {
        const result = await client
            .from("conversations")
            .insert({ user1, user2 })
            .select("id")
            .single();

        conversation = result.data;
        error = result.error;

        if (error) {
            alert("Не удалось создать переписку");
            console.error(error);
            return;
        }
    }

    activeConversationId = conversation.id;

    const chatTitle = document.querySelector("#chat h1");
    if (chatTitle) {
        chatTitle.textContent = contact.display_name;
    }

    showScreen("chat");
    await loadPrivateMessages();
}

// ЗАГРУЗКА СООБЩЕНИЙ
async function loadPrivateMessages() {
    const client = getClient();
    const messages = document.querySelector(".chat-messages");

    if (!client || !messages || !activeConversationId) return;

    const { data, error } = await client
        .from("messages")
        .select("sender_id, body, created_at")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const { data: sessionData } = await client.auth.getSession();
    const myId = sessionData.session?.user?.id;

    messages.innerHTML = "";

    (data || []).forEach(item => {
        const message = document.createElement("div");

        message.className = item.sender_id === myId
            ? "message sent"
            : "message received";

        message.textContent = item.body;
        messages.appendChild(message);
    });

    messages.scrollTop = messages.scrollHeight;
}

// ОТПРАВКА ЛИЧНОГО СООБЩЕНИЯ
window.sendMessage = async function() {
    const client = getClient();
    const input = document.getElementById("messageText");

    if (!client || !input || !activeConversationId) {
        alert("Сначала открой личный чат ✦");
        return;
    }

    const body = input.value.trim();
    if (!body) return;

    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) return;

    const { error } = await client
        .from("messages")
        .insert({
            conversation_id: activeConversationId,
            sender_id: user.id,
            body: body
        });

    if (error) {
        alert("Не удалось отправить сообщение");
        console.error(error);
        return;
    }

    input.value = "";
    await loadPrivateMessages();
};

// КНОПКА «НАПИСАТЬ» В ПРОФИЛЕ
document.addEventListener("click", function(event) {
    const button = event.target.closest("#contactProfile button");

    if (!button || button.textContent.trim() !== "Написать") {
        return;
    }

    event.stopImmediatePropagation();

    const username = document.querySelector(
        "#contactProfile p"
    )?.textContent.replace("@", "").trim();

    if (username) {
        openPrivateChat(username);
    }
}, true);
// MEVARI — ОБНОВЛЕНИЕ СООБЩЕНИЙ В РЕАЛЬНОМ ВРЕМЕНИ

let mevariRealtimeChannel = null;

const previousOpenPrivateChat = window.openPrivateChat;

window.openPrivateChat = async function(username) {
    await previousOpenPrivateChat(username);

    if (!activeConversationId) return;

    const client = getClient();

    if (!client) return;

    if (mevariRealtimeChannel) {
        await client.removeChannel(mevariRealtimeChannel);
        mevariRealtimeChannel = null;
    }

    const conversationId = activeConversationId;

    mevariRealtimeChannel = client
        .channel("mevari-chat-" + conversationId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: "conversation_id=eq." + conversationId
            },
            () => {
                if (activeConversationId === conversationId) {
                    loadPrivateMessages();
                }
            }
        )
        .subscribe();
};