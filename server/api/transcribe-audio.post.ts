export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  try {
    const audioBuffer = await readRawBody(event, false);

    if (!audioBuffer || audioBuffer.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Audio binary data is required",
      });
    }

    if (!config.deepgramApiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Deepgram API key is not configured",
      });
    }

    const url =
      "https://api.deepgram.com/v1/listen?language=ru&model=nova-2-general&smart_format=true&punctuate=true&profanity_filter=false&filler_words=true";
    const apiKey = config.deepgramApiKey;

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
        "Content-Type": "audio/wav",
      },
      body: audioBuffer,
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
  } catch (error) {
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
