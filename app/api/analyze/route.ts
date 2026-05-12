import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await fetch(`${process.env.CODEWORDS_RUNTIME_URI}/run/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CODEWORDS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "Tu es un conseiller financier personnel bienveillant. Analyse le budget mensuel. Donne exactement: 1) 2-3 points forts (avec emoji vert), 2) 2-3 points faibles (avec emoji orange), 3) 1-2 recommandations (avec emoji ampoule). Sois concis, direct et encourageant. Max 180 mots. En francais."
          },
          { role: "user", content: body.prompt }
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return NextResponse.json({ analysis: data.choices?.[0]?.message?.content || "Analyse indisponible" });
  } catch {
    return NextResponse.json({ analysis: "Erreur lors de l'analyse" }, { status: 500 });
  }
}

