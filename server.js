const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Statik dosyaları (HTML vb.) sunma
app.use(express.static(path.join(__dirname)));

// Gemini API ile mesajlaşma rotası
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ reply: "Hata: GEMINI_API_KEY çevre değişkeni (environment variable) tanımlanmamış." });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }]
            })
        });

        const data = await response.json();
        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Yapay zekadan yanıt üretilemedi.";

        res.json({ reply: aiReply });
    } catch (error) {
        console.error("API Hatası:", error);
        res.status(500).json({ reply: "Sunucu tarafında bir hata oluştu." });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});