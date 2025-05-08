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

    // 🔐 Запрос токена и chat_id через prompt()
    const TELEGRAM_BOT_TOKEN = prompt("Введите ваш Telegram Bot Token:", "");
    const TELEGRAM_CHAT_ID = prompt("Введите ваш Telegram Chat ID:", "");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        alert("Необходимо указать Telegram Bot Token и Chat ID");
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
                if (url) weaponUrls[key] = url;
            }
        }

        // 🎯 logo: 1 до 21
        const logoUrls = {};
        for (const file of logoFiles) {
            const key = file.name.replace(".png", "");
            if (key >= 1 && key <= 21) {
                const url = await uploadToTelegram(file, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
                if (url) logoUrls[key] = url;
            }
        }

        // 🔑 auth.png
        let authUrl = "";
        if (authFile) {
            authUrl = await uploadToTelegram(authFile, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
        }

        // 🔄 Обновляем JS-код
        jsCode = updateJsCode(jsCode, "weapon", weaponUrls);
        jsCode = updateJsCode(jsCode, "logo", logoUrls);

        if (authUrl) {
            jsCode = updateBackgroundImage(jsCode, authUrl);
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

// 📤 Загрузка файла на Telegram
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
        alert("Ошибка подключения к Telegram API");
    }

    return "";
}

// 🧠 Обновление JS-объекта (weapon или logo)
function updateJsCode(code, objName, urlMapping) {
    const regex = new RegExp(`${objName}:\\s*{([^}]*)}`, 's');
    const match = code.match(regex);
    if (!match) return code;

    let content = match[0].slice(match[0].indexOf("{") + 1, match[0].lastIndexOf("}")).trim();

    for (const [key, url] of Object.entries(urlMapping)) {
        const keyRegex = new RegExp(`"${key}"\\s*:\\s*"[^"]*"`, 'g');
        content = content.replace(keyRegex, `"${key}": "${url}"`);
    }

    const newObj = `${objName}: {${content}}`;
    return code.replace(regex, newObj);
}

// 🖼 Обновление background-image
function updateBackgroundImage(code, url) {
    return code.replace(/url\(\s*"[^)]*"\s*\)/, `url("${url}")`);
}
