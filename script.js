document.getElementById("uploadForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const jsFile = document.getElementById("jsFile").files[0];
    const weaponFiles = Array.from(document.getElementById("weaponImages").files);
    const logoFiles = Array.from(document.getElementById("logoImages").files);
    const authFile = document.getElementById("authImage").files[0];

    if (!jsFile || !authFile) {
        alert("Пожалуйста, загрузите все файлы");
        return;
    }

    // 🔐 Получаем токен и chat_id через prompt()
    const TELEGRAM_BOT_TOKEN = prompt("Введите ваш Telegram Bot Token:");
    const TELEGRAM_CHAT_ID = prompt("Введите ваш Telegram Chat ID:");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        alert("Вы должны ввести Telegram Bot Token и Chat ID");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function () {
        let jsCode = reader.result;

        // 📦 weapon: 0, 24, 25, 31
        const weaponUrls = {};
        for (const file of weaponFiles) {
            const key = file.name.replace(".png", "");
            if (["0", "24", "25", "31"].includes(key)) {
                const url = await uploadToTelegram(file, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
                if (url && url.endsWith(".jpg")) {
                    weaponUrls[key] = url.replace(".jpg", ".png");
                } else {
                    weaponUrls[key] = url;
                }
            }
        }

        // 🎯 logo: 1–21
        const logoUrls = {};
        for (const file of logoFiles) {
            const key = file.name.replace(".png", "");
            if (key >= 1 && key <= 21) {
                const url = await uploadToTelegram(file, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
                if (url && url.endsWith(".jpg")) {
                    logoUrls[key] = url.replace(".jpg", ".png");
                } else {
                    logoUrls[key] = url;
                }
            }
        }

        // 🔑 winauth/auth.png
        let authUrl = "";
        if (authFile) {
            authUrl = await uploadToTelegram(authFile, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
            if (authUrl && authUrl.endsWith(".jpg")) {
                authUrl = authUrl.replace(".jpg", ".png");
            }
        }

        // 🔄 Обновляем JS-код
        jsCode = updateJsObject(jsCode, "weapon", weaponUrls);
        jsCode = updateJsObject(jsCode, "logo", logoUrls);

        // 🖼 Обновляем background-image
        if (authUrl) {
            jsCode = updateBackgroundImageUrl(jsCode, authUrl);
        }

        // 📄 Сохраняем обработанный файл
        const blob = new Blob([jsCode], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "mxzzxtrx.txt";
        link.textContent = "Скачать готовый файл";
        document.getElementById("result").innerHTML = "";
        document.getElementById("result").appendChild(link);
    };

    reader.readAsText(jsFile);
});

// 📤 Загрузка изображения на Telegram
async function uploadToTelegram(file, token, chatId) {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("chat_id", chatId);

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        if (data.ok) {
            const fileId = data.result.photo[0].file_id;
            const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
            const infoData = await fileInfoRes.json();
            const filePath = infoData.result.file_path;
            return `https://api.telegram.org/file/bot${token}/${filePath}`;
        } else {
            console.error("[Ошибка отправки]", data.description);
            alert("Ошибка загрузки изображения на Telegram");
        }
    } catch (err) {
        console.error("[Ошибка загрузки в Telegram]", err);
        alert("Не удалось подключиться к Telegram API");
    }

    return "";
}

// 🧠 Обновление JS-объекта (weapon или logo)
function updateJsObject(code, objName, urlMapping) {
    const regex = new RegExp(`${objName}:\\s*{([^}]*)}`, 's');
    const match = code.match(regex);
    if (!match) return code;

    let content = match[0];
    let inner = content.slice(content.indexOf("{") + 1, content.lastIndexOf("}"));

    // Удаляем сломанные ключи вроде "1"0"
    inner = inner.replace(/"[^"]+":\s*".*?",?\s*/g, (match) => {
        const fixedMatch = match.replace(/"/g, '');
        return fixedMatch;
    });

    // Добавляем правильные ключи
    for (const key in urlMapping) {
        const value = urlMapping[key];
        const keyRegex = new RegExp(`"${key}"\\s*:\\s*"[^"]*"`, 'g');
        inner = inner.replace(keyRegex, `"${key}": "${value}"`);
    }

    // Собираем обратно объект
    const newObj = `${objName}: {${inner}}`;
    return code.replace(regex, newObj);
}

// 🖼 Обновление background-image в строке 475
function updateBackgroundImageUrl(code, url) {
    const lines = code.split("\n");

    if (lines.length >= 475) {
        let line = lines[474]; // строка 475 (индекс 474)

        // Ищем url() и заменяем его
        const match = line.match(/url\s*$([^)]*)$/);
        if (match) {
            line = line.replace(match[1], `"${url}"`);
            lines[474] = line;
            return lines.join("\n");
        }
    }

    return code;
}
