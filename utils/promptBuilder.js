function buildPrompt(tool, input) {

  switch (tool) {

    case "hashtag":
      return `Generate 20 viral Instagram hashtags for: ${input}`;

    case "readme":
      return `Generate a professional GitHub README for: ${input}`;

    case "seo":
      return `Write SEO optimized meta description for: ${input}`;

    case "blog":
      return `Write a detailed blog article about: ${input}`;

    default:
      return input;
  }
}

export default buildPrompt;
