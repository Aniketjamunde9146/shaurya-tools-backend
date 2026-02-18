import express from "express";
import axios from "axios";
import buildPrompt from "../utils/promptBuilder.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { tool, input } = req.body;

    if (!tool || !input) {
      return res.status(400).json({
        error: "Tool and input are required"
      });
    }

    const finalPrompt = buildPrompt(tool, input);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "user", content: finalPrompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("FULL ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
});

export default router;
