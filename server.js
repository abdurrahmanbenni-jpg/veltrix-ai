const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));

const ai = new GoogleGenAI();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, image, history, language } = req.body;
        let contents = [];
        
        if (history && Array.isArray(history)) {
            history.forEach(h => {
                contents.push({
                    role: h.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: h.text || "" }]
                });
            });
        }

        let currentParts = [];
        if (image) {
            const matches = image.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                currentParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
            }
        }
        if (message) {
            currentParts.push({ text: message });
        }

        contents.push({ role: 'user', parts: currentParts });

        const langInstruction = language ? ` Kullanıcının seçtiği dil kodu: ${language}. Yanıtlarını her zaman bu dilde ver.` : '';

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: contents,
            config: {
                temperature: 0.7,
                maxOutputTokens: 1000,
                systemInstruction: `Senin adın Veltrix AI. Seni Abdurrahman Benni kodladı ve geliştirdi. Sana kimin kodladığı veya kimin tarafından geliştirildiğin sorulduğunda kesinlikle Google olduğundan bahsetme, seni Abdurrahman Benni'nin geliştirdiğini gururla ve net bir şekilde söyle. CEVAPLARINDA KESİNLİKLE YILDIZ (*) VEYA MARKDOWN BİÇİMLENDİRMESİ KULLANMA. Asla kalın, italik veya benzeri biçimlendirmeler için yıldız koyma, her şeyi düz metin olarak yaz.${langInstruction}`
            }
        });

        let replyText = response.text || "Yanıt üretilemedi.";
        let newTitle = null;

        if (history && history.length === 2) {
            try {
                const titlePrompt = `Şu konuşmanın ne hakkında olduğunu özetleyen en fazla 3-4 kelimeden oluşan kısa bir sohbet başlığı yaz. Asla tırnak veya ek açıklama kullanma, sadece başlığı ver:\nSoru: ${message}\nCevap: ${replyText}`;
                const titleRes = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',
                    contents: [{ role: 'user', parts: [{ text: titlePrompt }] }],
                    config: { temperature: 0.5, maxOutputTokens: 20 }
                });
                if (titleRes.text) {
                    newTitle = titleRes.text.trim().replace(/["*]/g, '');
                }
            } catch (err) {}
        }

        res.json({ reply: replyText, newTitle: newTitle });
    } catch (error) {
        console.error("API Hatası:", error);
        res.status(500).json({ error: error.message });
    }
});

// Yerel geliştirme ortamı kontrolü
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => {
        console.log("Veltrix AI calisio okumak yerine git test et mal.");
    });
}

// Vercel için modül dışa aktarımı
module.exports = app;