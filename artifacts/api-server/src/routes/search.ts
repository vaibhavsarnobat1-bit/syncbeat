import { Router, type IRouter } from "express";
// @ts-ignore — ytsr is a CJS module without bundled types
import ytsr from "ytsr";

const router: IRouter = Router();

// ── Artist name expansion ──────────────────────────────────────────────────
const ARTIST_MAPPING: Record<string, string> = {
  "arijit": "Arijit Singh",
  "jubin": "Jubin Nautiyal",
  "neha": "Neha Kakkar",
  "darshan": "Darshan Raval",
  "atif": "Atif Aslam",
  "shreya": "Shreya Ghoshal",
  "sonu": "Sonu Nigam",
  "rahat": "Rahat Fateh Ali Khan",
  "honey": "Yo Yo Honey Singh",
  "badshah": "Badshah",
  "diljit": "Diljit Dosanjh",
  "ap dhillon": "AP Dhillon",
  "karan aujla": "Karan Aujla",
  "lata": "Lata Mangeshkar",
  "asha": "Asha Bhosle",
  "kishore": "Kishore Kumar",
  "rafi": "Mohammed Rafi",
  "udit": "Udit Narayan",
  "kumar sanu": "Kumar Sanu",
  "ed sheeran": "Ed Sheeran",
  "taylor": "Taylor Swift",
  "justin": "Justin Bieber",
  "bruno": "Bruno Mars",
  "eminem": "Eminem",
  "drake": "Drake",
  "coldplay": "Coldplay",
  "billie": "Billie Eilish",
  "dua lipa": "Dua Lipa",
  "arjun": "Arjun Kanungo",
  "raftaar": "Raftaar",
  "divine": "DIVINE",
  "nucleya": "Nucleya",
  "prateek": "Prateek Kuhad",
  "sunidhi": "Sunidhi Chauhan",
  "shankar": "Shankar Mahadevan",
  "mohit": "Mohit Chauhan",
  "lucky ali": "Lucky Ali",
  "shaan": "Shaan",
};

// Detect Devanagari (Hindi) script
function isHindi(q: string): boolean {
  return /[\u0900-\u097F]/.test(q);
}

// Build a smart search query
function buildQuery(q: string): string {
  const lower = q.toLowerCase().trim();

  // Language queries → playlists
  if (/^(hindi|hindi songs?|all hindi songs?)$/.test(lower)) return "best hindi hit songs 2024 2025 official music video";
  if (/^(marathi|marathi songs?|all marathi songs?)$/.test(lower)) return "best marathi hit songs 2024 official music video";
  if (/^(english|english songs?|pop songs?)$/.test(lower)) return "latest english pop hits 2024 2025 official music video";
  if (/^(punjabi|punjabi songs?|all punjabi songs?)$/.test(lower)) return "latest punjabi hit songs 2024 2025 official music video";
  if (/^(bhojpuri|bhojpuri songs?)$/.test(lower)) return "superhit bhojpuri songs 2024 official music video";

  // Artist mapping: partial name → full name + popular songs
  for (const [key, fullName] of Object.entries(ARTIST_MAPPING)) {
    if (lower.includes(key)) {
      return `${fullName} best songs hits official video`;
    }
  }

  // Hindi Devanagari query
  if (isHindi(q)) return `${q} latest song official video`;

  // Short query (1-3 words) without song keywords → treat as artist
  const keywords = ["song","lyrics","feat","ft.","remix","official","video","audio","full","cover","#"];
  const isSpecific = keywords.some(k => lower.includes(k));
  const wordCount = q.trim().split(/\s+/).length;
  if (!isSpecific && wordCount <= 3) return `${q} songs`;

  return q;
}

// ── Parse a ytsr item into our standard shape ──────────────────────────────
function parseItem(item: any) {
  if (!item || item.type !== "video") return null;
  const videoId = item.id || "";
  if (!videoId || !item.title) return null;
  return {
    videoId,
    title: item.title as string,
    thumbnail:
      (item.thumbnails && item.thumbnails[0]?.url) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: parseDuration(item.duration),
    channel: item.author?.name ?? "",
  };
}

function parseDuration(dur: string | null | undefined): number {
  if (!dur) return 0;
  const parts = dur.split(":").map(Number);
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  return 0;
}

async function searchYT(query: string, limit = 15) {
  const filters = await ytsr.getFilters(query);
  const videoFilter = filters.get("Type")?.get("Video");
  const searchOpts = { limit: limit * 3, gl: "IN", hl: "en" }; // Fetch more to account for strict filtering
  const url = videoFilter?.url ?? query;
  const results = await ytsr(url, searchOpts);
  
  // Words that indicate a list/playlist instead of a single song
  const BAD_WORDS = ["jukebox", "mashup", "nonstop", "collection", "best of", "top 10", "top 20", "top 50", "audiobox"];

  return (results.items as any[])
    .map(parseItem)
    .filter(item => {
      if (!item || item.duration <= 0 || item.duration > 420000) return false; // MUST be under 7 minutes
      const lowerTitle = item.title.toLowerCase();
      if (BAD_WORDS.some(w => lowerTitle.includes(w))) return false; // Reject compilations
      return true;
    })
    .slice(0, limit) as {
      videoId: string; title: string; thumbnail: string; duration: number; channel: string;
    }[];
}

// ── GET /api/search?q= ─────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) { res.status(400).json({ error: "Query required" }); return; }

  try {
    const query = buildQuery(q);
    const videos = await searchYT(query, 15);
    res.json({ results: videos });
  } catch (err) {
    console.error("YouTube search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ── GET /api/search/trending ───────────────────────────────────────────────
router.get("/trending", async (_req, res) => {
  try {
    const videos = await searchYT("trending bollywood single song 2025 official video", 12);
    res.json({ results: videos });
  } catch {
    res.json({ results: [] });
  }
});

// ── GET /api/search/insta-trending ────────────────────────────────────────
// Returns 4 batches of 4 songs — each batch from a different themed query
// so songs are always fresh/available (no hardcoded unavailable IDs)
router.get("/insta-trending", async (_req, res) => {
  // Randomize a little bit so refreshing fetches different themes
  // Using specific famous artists ensures we get single songs, not generic compilation videos
  const ALL_QUERIES = [
    { query: "Ed Sheeran popular pop hit single song official video", badge: "🌍 Global" },
    { query: "Arijit Singh latest romantic hit single song official video", badge: "🔥 #1 Reels" },
    { query: "Justin Bieber pop hit single song official video", badge: "✨ Pop" },
    { query: "Diljit Dosanjh latest hit single song official video", badge: "🎵 Hot" },
    { query: "The Weeknd pop hit single song official video", badge: "🎧 Chill" },
    { query: "Darshan Raval emotional hit single song official video", badge: "🥺 Feels" },
    { query: "Dua Lipa dance pop hit single song official video", badge: "💃 Trend" },
    { query: "Karan Aujla trending punjabi hit single song official video", badge: "📈 Viral" },
    { query: "Alan Walker famous song official video", badge: "🔥 Trend" },
    { query: "Selena Gomez pop hit song official video", badge: "❤️ Pop" },
    { query: "Shreya Ghoshal beautiful melody single song official video", badge: "❤️ Love" },
    { query: "Charlie Puth famous hit song official video", badge: "✨ Hits" },
  ];
  // Shuffle and pick 4
  const BATCH_QUERIES = ALL_QUERIES.sort(() => 0.5 - Math.random()).slice(0, 4);

  try {
    const batchResults = await Promise.all(
      BATCH_QUERIES.map(async ({ query, badge }) => {
        try {
          const songs = await searchYT(query, 5);
          // Take top 4, attach badge
          return songs.slice(0, 4).map(s => ({ ...s, badge }));
        } catch {
          return [];
        }
      })
    );
    // Filter out empty batches
    const batches = batchResults.filter(b => b.length > 0);
    res.json({ batches });
  } catch {
    res.json({ batches: [] });
  }
});

// ── GET /api/search/related?title= ────────────────────────────────────────
router.get("/related", async (req, res) => {
  const title = String(req.query.title || "").trim();
  if (!title) { res.json({ results: [] }); return; }
  try {
    const keywords = title.replace(/\(.*?\)/g, "").split(/[\s|–-]+/).slice(0, 3).join(" ");
    const videos = await searchYT(`${keywords} songs`, 10);
    res.json({ results: videos });
  } catch (err) {
    console.error("Related search error:", err);
    res.json({ results: [] });
  }
});

export default router;
