import express from "express";
import axios from "axios";
import buildPrompt from "../utils/promptBuilder.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { tool, input } = req.body;

    if (!tool || !input) {
      return res.status(400).json({
        success: false,
        error: "Tool and input are required"
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "API key not configured"
      });
    }

    const finalPrompt = buildPrompt(tool, input);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    const content =
      response.data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      success: true,
      data: content
    });

  } catch (error) {
    console.error("AI ROUTE ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

export default router;
