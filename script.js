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

    const reader = new FileReader();
    reader.onload = async function () {
        let jsCode = reader.result;

        // Токен бота и chat_id — введите свои!
        const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
        const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID";

        // Загрузка weapon
        const weaponUrls = {};
        for (const file of weaponFiles) {
            const key = file.name.replace(".png", "");
            if (["0", "24", "25", "31"].includes(key)) {
                const url = await uploadToTelegram(file, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
                if (url) weaponUrls[key] = url;
            }
        }

        // Загрузка logo
        const logoUrls = {};
        for (const file of logoFiles) {
            const key = file.name.replace(".png", "");
            if (key >= 1 && key <= 21) {
                const url = await uploadToTelegram(file, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
                if (url) logoUrls[key] = url;
            }
        }

        // Загрузка auth.png
        let authUrl = "";
        if (authFile) {
            authUrl = await uploadToTelegram(authFile, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
        }

        // Обновляем JS-код
        jsCode = updateJsCode(jsCode, "weapon", weaponUrls);
        jsCode = updateJsCode(jsCode, "logo", logoUrls);

        // Обновляем background-image
        if (authUrl) {
            jsCode = updateBackgroundImage(jsCode, authUrl);
        }

        // Сохраняем обработанный код
        const blob = new Blob([jsCode], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "mxzzxtrx.txt";
        link.textContent = "Скачать готовый файл";
        document.getElementById("result").appendChild(link);
    };

    reader.readAsText(jsFile);
});

// === Функции ===

async function uploadToTelegram(file, token, chatId) {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("chat_id", chatId);

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            body: formData
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
        }
    } catch (err) {
        console.error("[Ошибка загрузки в Telegram]", err);
    }

    return "";
}

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

function updateBackgroundImage(code, url) {
    const regex = /background-image\s*:\s*url\(\s*["']?[^)"']*["']?\s*\)/;
    return code.replace(regex, `background-image: url("${url}")`);
}