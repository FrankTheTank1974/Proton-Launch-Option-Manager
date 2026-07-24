import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Endpoint
  app.post('/api/gemini/analyze', async (req, res) => {
    const { gameName, distro, prompt, currentCommand } = req.body;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          advice: `For **${gameName}** on **${distro}**:\n\n` +
            `• Set \`PROTON_USE_NTSYNC=1\` for fast kernel thread synchronization.\n` +
            `• Set \`PROTON_ENABLE_NVAPI=1\` for Nvidia DLSS and Reflex.\n` +
            `• Wrap with \`gamemoderun %command%\` for CPU/GPU governor priority.\n` +
            `• Configure \`VKD3D_CONFIG=dxr11,dxr\` for Direct3D 12 Ray Tracing.`,
          recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 VKD3D_CONFIG=dxr11,dxr gamemoderun %command%`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model,
        contents: `You are a Linux gaming and Steam Proton performance expert.
The user is playing "${gameName}" on "${distro}".
Current launch command: "${currentCommand || '%command%'}".
User question: "${prompt}".

Provide a concise, highly technical answer detailing optimal Proton flags (such as PROTON_USE_WINE, PROTON_USE_NTSYNC, DISABLE_SHADER_CACHE, gamemoderun, VKD3D_CONFIG, mangohud, PROTON_ENABLE_NVAPI) and recommend a final single line command string formatted with %command%. Format your response as JSON with keys: "advice" (string) and "recommendedCommand" (string).`,
      });

      const text = response.text || '';
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        }
      } catch {
        // Ignore json parse error and send raw response
      }

      return res.json({
        advice: text || `Recommended options for ${gameName}: Use PROTON_USE_NTSYNC=1 PROTON_ENABLE_NVAPI=1 gamemoderun %command%`,
        recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 gamemoderun %command%`,
      });
    } catch (err) {
      console.error('Gemini API Error:', err);
      return res.json({
        advice: `For **${gameName}** on **${distro}**:\n\n` +
          `• Enable \`PROTON_USE_NTSYNC=1\` for fast kernel thread sync.\n` +
          `• Enable \`PROTON_ENABLE_NVAPI=1\` for DLSS support.\n` +
          `• Add \`gamemoderun %command%\` for performance mode.`,
        recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 gamemoderun %command%`,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'Proton Launch Options Manager' });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
