function toggleInputFields() {
  const inputType = document.getElementById("input-type").value;
  const urlInput = document.getElementById("url-input");
  const songArtistNameInput = document.getElementById("song-artist-name-input");

  if (inputType === "url") {
    urlInput.classList.remove("hidden");
    songArtistNameInput.classList.add("hidden");
  } else {
    urlInput.classList.add("hidden");
    songArtistNameInput.classList.remove("hidden");
  }
}

async function searchSong() {
  const yt_url = new URL(document.getElementById("url").value);
  const videoID = new URLSearchParams(yt_url.search).get("v");
  console.log(videoID);

  const title = await getTitleByYoutubeUrl();
  const lyric = await getLyric(title);

  // Insert iframe of YouTube video
  const container = document.getElementById("video");
  container.innerHTML = `<iframe width="100%" height="100%" src="https://corsproxy.io/?url=https://www.youtube.com/embed/${videoID}" frameborder="0"></iframe>`;

  //Print out lyrics
  document.getElementById("lyric").innerHTML =
    "<p>" + lyric.replace(/\n/g, "<br>") + "</p>";

  // Print out metadata
  let metadata;
  getMetadata(title).then((data) => {
    metadata = data;
    displayMetadata(metadata);
  });
}

/**
 * Get title of YouTube video from noembed API
 */
async function getTitleByYoutubeUrl() {
  const url = document.getElementById("url").value;

  return fetch(`https://noembed.com/embed?dataType=json&url=${url}`)
    .then((response) => response.json())
    .then((data) => {
      const formattedTitle = data.title.replace(/\(.*?\)/g, "").trim();
      console.log(`Title: ${formattedTitle}`);
      return formattedTitle;
    });
}

/**
 * Search LRCLIB API via song title and return lyric
 */
function getLyric(title) {
  // Convert song title to URI
  const queryValue = encodeURIComponent(title).replace(/%20/g, "+");

  return fetch(`https://lrclib.net/api/search?q=${queryValue}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(`Lyric: ${data[0].plainLyrics}`);
      return data[0].plainLyrics;
    });
}

async function getMetadataBySongAndArtist() {
  const title = document.getElementById("song-title").value;
  const artist = document.getElementById("artist-name").value;

  try {
    // Get master URL
    let master_url;
    await fetch(
      `https://api.discogs.com/database/search?release_title=${title}&artist=${artist}&type=master&per_page=1&page=1`,
    )
      .then((response) => response.json())
      .then((data) => {
        master_url = data.results[0].master_url;
      });

    // Get and return song metadata object
    await fetch(master_url)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        return data;
      });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get song metadata via discogs API search.
 * @param {string} title
 * @returns {Object} song metadata
 */
async function getMetadataByYoutubeUrl(title) {
  // Format title to reduce search mismatch
  const formattedTitle = title.replace(/\(.*?\)/g, "").trim();

  try {
    // Search for song master_id via title / artist name
    const searchResponse = await fetch(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(formattedTitle)}`,
    );

    if (!searchResponse.ok) {
      throw new Error(
        `Error fetching search results: ${searchResponse.status}`,
      );
    }

    const searchData = await searchResponse.json();
    const masterId = searchData.results[0]?.master_id;

    if (!masterId) {
      throw new Error("Master ID does not exist.");
    }
    console.log(masterId);
    // Get main_release
    const masterIdResponse = await fetch(
      `https://api.discogs.com/masters/${masterId}`,
    );

    if (!masterIdResponse.ok) {
      throw new Error(`Error fetching master data: ${masterIdResponse.status}`);
    }

    const masterData = await masterIdResponse.json();

    if (!masterData) {
      throw new Error("Main release does not exist.");
    }

    return masterData;
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

async function displayMetadata(metadata) {
  let title = metadata.title;
  console.log(`Title: ${title}`);

  let artists = [];
  for (artist in metadata.artists) {
    artists.push(metadata.artists[artist].name);
  }
  console.log(`Artist: ${artists.join(", ")}`);

  let labels = [];
  for (label in metadata.labels) {
    labels.push(metadata.labels[label].name);
  }
  console.log(`Label: ${labels.join(", ")}`);

  let release = metadata.released;
  console.log(`Released: ${release}`);

  let genres = [];
  for (genre in metadata.genres) {
    genres.push(metadata.genres[genre]);
  }
  console.log(`Genre: ${genres.join(", ")}`);

  let styles = [];
  for (style in metadata.styles) {
    styles.push(metadata.styles[style]);
  }
  console.log(`Style: ${styles.join(", ")}`);

  let extraArtists = [];
  for (artist in metadata.extraartists) {
    extraArtists.push(
      `${metadata.extraartists[artist].role} – ${metadata.extraartists[artist].name}`,
    );
  }
  console.log(`Credits: ${extraArtists.join("\n")}`);

  document.getElementById("metadata").innerHTML =
    `<p style="white-space: pre-line;">
    ${title ? `Title: ${title}\n` : ""}
    ${artists.length > 0 ? `Artist: ${artists.join(", ")}\n` : ""}
    ${labels.length > 0 ? `Label: ${labels.join(", ")}\n` : ""}
    ${release ? `Released: ${release}\n` : ""}
    ${genres.length > 0 ? `Genre: ${genres.join(", ")}\n` : ""}
    ${styles.length > 0 ? `Style: ${styles.join(", ")}\n` : ""}
    ${extraArtists.length > 0 ? `Credits: ${extraArtists.join("\n")}` : ""}
  </p>`;
}

/**
 * Set background as blurred song cover art.
 */
function setBackgroundImage(mbid) {
  const backgroundDiv = document.getElementById("background");
  const imageUrl = `https://coverartarchive.org/release/${mbid}/front`;

  backgroundDiv.style.backgroundImage = imageUrl;
}
