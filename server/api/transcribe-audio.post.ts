export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiKey = config.deepgramApiKey || process.env.DEEPGRAM_API_KEY;
  try {
    if (!event.context.user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const contentLength = Number(getRequestHeader(event, "content-length"));
    if (contentLength > 25 * 1024 * 1024) {
      // 25MB limit
      throw createError({
        statusCode: 413,
        statusMessage: "Payload too large",
      });
    }

    const audioBuffer = await readRawBody(event, false);

    if (!audioBuffer || audioBuffer.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Audio binary data is required",
      });
    }

    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Deepgram API key is not configured",
      });
    }

    const url =
      "https://api.deepgram.com/v1/listen?language=ru&model=nova-2-general&smart_format=true&punctuate=true&profanity_filter=false&filler_words=true";

    console.log(
      "Sending request to Deepgram, audio size:",
      audioBuffer.length,
      "bytes",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Token ${apiKey}`,
        "Content-Type": getRequestHeader(event, "content-type") || "audio/wav",
      },
      body: audioBuffer as any,
    });

    console.log(
      "Deepgram response status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error response:", errorText);

      throw createError({
        statusCode: response.status,
        statusMessage: `Deepgram API error: ${response.statusText} - ${errorText}`,
      });
    }

    const data = await response.json();
    console.log("Transcription successful");
    return data;
  } catch (error: any) {
    console.error("Transcription error details:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to transcribe audio: ${error.message}`,
    });
  }
});
