import YouTube from "youtube-sr";

async function run() {
  try {
    console.log("Searching with youtube-sr...");
    const results = await YouTube.search("Arijit Singh songs", { limit: 5, type: "video" });
    console.log("Results count:", results.length);
    for (const video of results) {
      console.log({
        id: video.id,
        title: video.title,
        duration: video.duration,
        thumbnail: video.thumbnail?.url,
        channel: video.channel?.name
      });
    }
  } catch (err) {
    console.error("Error searching:", err);
  }
}

run();
