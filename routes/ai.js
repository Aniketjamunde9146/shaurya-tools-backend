import express from "express";
import axios from "axios";
import buildPrompt, { getProviderForTool } from "../utils/promptBuilder.js";

const router = express.Router();

/* =============================================================
   Constants
============================================================= */
const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_MODEL   = "llama-3.1-8b-instant"; // fast, free — for simple tasks
const OPENAI_MODEL = "gpt-4o-mini";           // powerful  — for complex tasks

/* =============================================================
   POST /api/ai
   Auto-routes based on tool:
     groq  → hashtag, readme, seo, blog  (non-streaming JSON)
     openai → landing                     (streaming SSE)
============================================================= */
router.post("/", async (req, res) => {
  try {
    const { tool, input } = req.body;

    if (!tool || !input) {
      return res.status(400).json({
        success: false,
        error: "Tool and input are required",
      });
    }

    const provider = getProviderForTool(tool);

    console.log(`🔀 tool=${tool} → provider=${provider.toUpperCase()}`);

    if (provider === "openai") {
      return await handleOpenAIStream(req, res, tool, input);
    }

    return await handleGroq(req, res, tool, input);

  } catch (error) {
    console.error("ROUTER ERROR:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }
});

/* =============================================================
   POST /api/ai/landing  (dedicated endpoint — backwards compat)
============================================================= */
router.post("/landing", async (req, res) => {
  // Ensure input is present (frontend sends { tool, input })
  const input = req.body.input;
  if (!input) {
    return res.status(400).json({ success: false, error: "Input is required" });
  }
  return await handleOpenAIStream(req, res, "landing", input);
});

/* =============================================================
   GROQ — non-streaming, returns JSON
   Used for: hashtag, readme, seo, blog
============================================================= */
async function handleGroq(req, res, tool, input) {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GROQ_API_KEY is not configured on the server",
    });
  }

  try {
    const finalPrompt = buildPrompt(tool, input);

    const response = await axios.post(
      GROQ_URL,
      {
        model:       GROQ_MODEL,
        messages:    [{ role: "user", content: finalPrompt }],
        temperature: 0.7,
        max_tokens:  1500,
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";

    console.log(`✅ [GROQ] tool=${tool} | chars=${content.length}`);

    return res.status(200).json({
      success:  true,
      data:     content,
      provider: "groq",
    });

  } catch (error) {
    console.error("GROQ ERROR:", error.response?.data || error.message);

    const status = error.response?.status || 500;
    const msg    = error.response?.data?.error?.message || error.message;

    return res.status(status).json({ success: false, error: msg });
  }
}

/* =============================================================
   OPENAI — streaming SSE response
   Used for: landing (needs high quality + large token output)
============================================================= */
async function handleOpenAIStream(req, res, tool, input) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "OPENAI_API_KEY is not configured on the server",
    });
  }

  /* SSE headers — must be set before any data is sent */
  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  try {
    const finalPrompt = buildPrompt(tool, input);

    const openaiRes = await axios.post(
      OPENAI_URL,
      {
        model:       OPENAI_MODEL,
        max_tokens:  4000,
        stream:      true,
        temperature: 0.7,
        messages: [
          {
            role:    "system",
            content:
              "You are an expert frontend developer. Output ONLY raw HTML starting with <!DOCTYPE html> and ending with </html>. No markdown, no code fences, no explanation whatsoever.",
          },
          { role: "user", content: finalPrompt },
        ],
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: "stream",
        timeout:      90000,
      }
    );

    console.log(`✅ [OPENAI] tool=${tool} | streaming started`);

    /* Pipe OpenAI SSE stream directly to client */
    openaiRes.data.on("data", (chunk) => {
      res.write(chunk.toString());
    });

    openaiRes.data.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
      console.log(`✅ [OPENAI] tool=${tool} | stream complete`);
    });

    openaiRes.data.on("error", (err) => {
      console.error("OPENAI STREAM ERROR:", err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

    /* Clean up if client disconnects early */
    req.on("close", () => {
      openaiRes.data.destroy();
      console.log(`⚠️  [OPENAI] tool=${tool} | client disconnected`);
    });

  } catch (error) {
    console.error("OPENAI ERROR:", error.response?.data || error.message);

    /* Headers already sent — can't send JSON error, just close */
    if (res.headersSent) {
      res.end();
      return;
    }

    const status = error.response?.status || 500;
    const msg    = error.response?.data?.error?.message || error.message;

    return res.status(status).json({ success: false, error: msg });
  }
}

export default router;