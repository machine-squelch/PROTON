import { AtomType, WaveParams, EntityType } from "../types";

type SDResponse =
  | { images?: string[]; output?: string[]; image?: string; error?: string }
  | { error: string };

// Base and endpoint are configurable so we can match different providers.
const SD_API_BASE = import.meta.env.VITE_SD_API_BASE_URL || "https://modelslab.com";
// If a full endpoint is provided, use it as-is. Otherwise, append the default path once.
const SD_ENDPOINT = (() => {
  const envEndpoint = import.meta.env.VITE_SD_ENDPOINT;
  if (envEndpoint) return envEndpoint;
  if (SD_API_BASE.includes("/api/")) return SD_API_BASE;
  return `${SD_API_BASE}/api/v6/images/text2img`;
})();
const SD_IMG2IMG_ENDPOINT =
  import.meta.env.VITE_SD_IMG2IMG_ENDPOINT || `${SD_API_BASE}/api/v6/images/img2img`;
const SD_API_KEY = import.meta.env.VITE_SD_API_KEY || "";
const SD_API_KEY_HEADER = import.meta.env.VITE_SD_API_KEY_HEADER || ""; // e.g., "X-API-KEY"; leave blank to omit
const SD_MODEL = import.meta.env.VITE_SD_MODEL || "flux-2-dev"; // defaults to your provided model
const SD_WIDTH = import.meta.env.VITE_SD_WIDTH || "1024";
const SD_HEIGHT = import.meta.env.VITE_SD_HEIGHT || "1024";
const SD_SAMPLES = Number(import.meta.env.VITE_SD_SAMPLES || 1); // single image to match UI expectations

export class QuantumAI {
  private static sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static buildPrompt(atom: AtomType, subject: EntityType, params: WaveParams) {
    // 2026 best practices: natural language, clear subject, structured hierarchy
    // Structure: subject + context + setting + lighting + technical quality
    const intensity = params.wavelength > 1.5 ? 'intense' : params.wavelength < 0.8 ? 'subtle' : 'moderate';
    const density = params.amplitude > 1.5 ? 'dense' : params.amplitude < 0.8 ? 'sparse' : 'flowing';
    
    return `A ${subject} materializing from ${intensity} quantum energy waves, ${density} streams of turquoise and emerald light converging around ${atom} atoms. Set in a futuristic physics laboratory with holographic displays and volumetric lighting. Cinematic composition, ray-traced reflections, 8k ultra-detailed, atmospheric depth.`;
  }

  private static parseImage(data: any) {
    const image =
      data?.image ||
      data?.images?.[0] ||
      data?.output?.[0] ||
      (Array.isArray(data?.artifacts) ? data.artifacts[0]?.base64 : undefined) ||
      (Array.isArray(data?.data) ? data.data[0]?.b64_json || data.data[0]?.url : undefined);
    return image;
  }

  private static async requestAndPoll(endpoint: string, body: Record<string, any>) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (SD_API_KEY && SD_API_KEY_HEADER) {
      headers[SD_API_KEY_HEADER] =
        SD_API_KEY_HEADER.toLowerCase() === "authorization" ? `Bearer ${SD_API_KEY}` : SD_API_KEY;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Stable Diffusion request failed: ${text}`);
    }

    const initialData = (await response.json()) as SDResponse;

    if ((initialData as any).status === "error" || (initialData as any).status === "failed" || (initialData as any).error) {
      const msg = (initialData as any).message || (initialData as any).error;
      const detail = (initialData as any)?.error_log?.error;
      throw new Error(detail ? `${msg || "Generation failed"} (${detail})` : (msg || "Stable Diffusion error"));
    }

    let image = this.parseImage(initialData);

    if (!image && (initialData as any).status === "processing" && (initialData as any).fetch_result) {
      const fetchUrl = (initialData as any).fetch_result as string;
      const maxAttempts = 6;
      const delayMs = 5000;
      let lastData: any = initialData;

      for (let attempt = 0; attempt < maxAttempts && !image; attempt++) {
        await this.sleep(delayMs);

        const urlWithKey =
          SD_API_KEY && !fetchUrl.includes("key=")
            ? `${fetchUrl}${fetchUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(SD_API_KEY)}`
            : fetchUrl;

        const pollRes = await fetch(urlWithKey, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            key: SD_API_KEY,
            request_id: (initialData as any)?.id
          })
        });
        if (!pollRes.ok) {
          const pollText = await pollRes.text();
          throw new Error(`Stable Diffusion poll failed: ${pollText}`);
        }
        try {
          lastData = await pollRes.json();
        } catch (e) {
          const pollText = await pollRes.text();
          throw new Error(`Stable Diffusion poll parse failed: ${pollText}`);
        }
        if (lastData?.status === "error" || lastData?.error) {
          const msg = lastData?.message || lastData?.error;
          throw new Error(msg || "Stable Diffusion polling error");
        }

        image = this.parseImage(lastData);

        if (lastData?.status !== "processing" && !image) {
          break;
        }
      }

      if (!image) {
        throw new Error(
          `No image returned from Stable Diffusion after polling. Payload: ${JSON.stringify(lastData).slice(0, 400)}`
        );
      }
    }

    if (!image) {
      throw new Error(`No image returned from Stable Diffusion. Payload: ${JSON.stringify(initialData).slice(0, 400)}`);
    }

    const isUrl = typeof image === "string" && image.startsWith("http");
    return isUrl ? image : `data:image/png;base64,${image}`;
  }

  static async generateQuantumManifestation(
    atom: AtomType,
    entity: EntityType,
    params: WaveParams,
    options?: { baseImage?: string }
  ) {
    const prompt = this.buildPrompt(atom, entity, params);
    const seed = Math.floor(Math.random() * 10_000_000);

    const basePayload: Record<string, any> = {
      model_id: SD_MODEL,
      prompt,
      width: SD_WIDTH,
      height: SD_HEIGHT,
      num_inference_steps: 30,
      samples: SD_SAMPLES,
      seed,
      negative_prompt:
        "blurry, low quality, watermark, text, logo, deformed, disfigured, bad anatomy, extra limbs, cropped, out of frame",
      key: SD_API_KEY
    };

    const baseImage = options?.baseImage;
    if (baseImage) {
      const initImage =
        baseImage.startsWith("http") || baseImage.startsWith("data:")
          ? baseImage
          : `data:image/png;base64,${baseImage}`;
      const imgPayload = {
        ...basePayload,
        init_image: [initImage],
        prompt,
        key: SD_API_KEY
      };
      return this.requestAndPoll(SD_IMG2IMG_ENDPOINT, imgPayload);
    }

    return this.requestAndPoll(SD_ENDPOINT, basePayload);
  }

  static async explainCollapse(atom: AtomType, entity: EntityType) {
    // Lightweight local text—no external model required.
    const openings = [
      "Under extreme decoherence",
      "When the chamber hit maximum resonance",
      "As spacetime thinned around the coil",
      "With the wavefunction stretched to its limits"
    ];
    const motifs = [
      "the field braided its probability tides",
      "quantum foam crystallized into mythic contours",
      "dark energy filaments stitched a silhouette",
      "plasma vortices carved out improbable anatomy",
      "gravity waves tuned every particle into song"
    ];
    const payoffs = [
      "until it resembled",
      "coalescing around",
      "collapsing straight into",
      "snapping into the outline of"
    ];
    const finishes = [
      "leaving auroral scars across the chamber glass.",
      "glittering for a heartbeat before dissolving.",
      "echoing like distant thunder in the far infra-bands.",
      "imprinting a brief afterimage on every sensor."
    ];

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    return `${pick(openings)}, ${pick(motifs)}, ${pick(payoffs)} ${entity}. ${pick(finishes)}`;
  }
}
