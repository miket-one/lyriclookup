// Set default url on page load
window.onload = function () {
  document.getElementById("search").click();
};

function toggleInputFields() {
  const inputType = document.getElementById("input-type").value;
  const urlInput = document.getElementById("url-input");
  const songArtistNameInput = document.getElementById("song-artist-name-input");

  if (inputType === "url") {
    urlInput.classList.remove("hidden");
    songArtistNameInput.classList.add("hidden");
    document.getElementById("url").required = true;
    document.getElementById("title-input").required = false;
    document.getElementById("artist-input").required = false;
  } else {
    urlInput.classList.add("hidden");
    songArtistNameInput.classList.remove("hidden");
    document.getElementById("url").required = false;
    document.getElementById("title-input").required = true;
    document.getElementById("artist-input").required = true;
  }
}

async function searchSong(event) {
  event.preventDefault();
  // Reset elements
  document.getElementById("video").innerHTML = "";
  document.getElementById("metadata").innerHTML = "";
  document.getElementById("lyric").innerHTML = "";
  document.getElementById("content").style.backgroundImage = "none";

  const inputType = document.getElementById("input-type").value;

  let title, artist, ytUrl, videoID, artistMetadata;
  if (
    // Search via YouTube URL
    inputType === "url"
  ) {
    ytUrl = new URL(document.getElementById("url").value);
    videoID = ytUrl.searchParams.get("v");

    title = await getTitleByYoutubeUrl(ytUrl);

    // Get and print metadata
    await getMetadataByYoutubeUrl(title).then(async (data) => {
      setBackgroundImage(data.images[0].uri);

      artistMetadata = await getArtistMetadata(data.artists[0].id);
      displayMetadata(data, artistMetadata);
    });
  } else // Search via song and artist name
  {
    title = document.getElementById("title-input").value;
    artist = document.getElementById("artist-input").value;

    // Get and print metadata
    await getMetadataBySongAndArtist(title, artist).then(async (data) => {
      ytUrl = new URL(data.videos[0].uri);
      videoID = ytUrl.searchParams.get("v");

      setBackgroundImage(data.images[0].uri);

      artistMetadata = await getArtistMetadata(data.artists[0].id);
      displayMetadata(data, artistMetadata);
    });
  }

  // Insert iframe of YouTube video
  const container = document.getElementById("video");
  container.innerHTML = `<iframe width="100%" height="100%" src="https://corsproxy.io/?url=https://www.youtube.com/embed/${videoID}" frameborder="0"></iframe>`;

  document.getElementById("loading-video").classList.add("hidden");

  //Print out lyrics
  const lyric = await getLyric(title, artist);

  document.getElementById("lyric").innerHTML =
    "<p>" + lyric.replace(/\n/g, "<br>") + "</p>";

  document.getElementById("loading-lyric").classList.add("hidden");
}

/**
 * Get title of YouTube video from noembed API
 */
function getTitleByYoutubeUrl(url) {
  return fetch(`https://noembed.com/embed?dataType=json&url=${url}`)
    .then((response) => response.json())
    .then((data) => {
      const formattedTitle = data.title.replace(/\(.*?\)/g, "").trim();
      console.log(`Title: ${formattedTitle}`);
      return formattedTitle;
    })
    .catch((error) => {
      console.error("Error fetching title:", error);
    });
}

/**
 * Search LRCLIB API via song title and return lyric
 */
function getLyric(title, artist = null) {
  let lyric;

  try {
    if (artist !== null) {
      return fetch(
        `https://lrclib.net/api/get?track_name=${title}&artist_name=${artist}`,
      )
        .then((response) => response.json())
        .then((data) => {
          if (!data.plainLyrics) {
            throw new Error(`No lyrics found: ${title} ${artist}`);
          }

          // Clean lyric
          lyric = data.plainLyrics.replace(/\[.*?\]/g, "").trim();
          return lyric;
        });
    } else {
      return fetch(`https://lrclib.net/api/search?track_name=${title}`)
        .then((response) => response.json())
        .then((data) => {
          if (!data[0].plainLyrics) {
            throw new Error(`No lyrics found: ${title}`);
          }

          // Clean lyric
          lyric = data[0].plainLyrics.replace(/\[.*?\]/g, "").trim();
          return lyric;
        });
    }
  } catch (error) {
    console.error("An error occurred: ", error.message);
  }
}

/**
 * Get song metadata via discogs API search via song title and artist name.
 * @returns {Object} song metadata
 */
async function getMetadataBySongAndArtist(title, artist) {
  try {
    // Get master URL
    const response = await fetch(
      `https://api.discogs.com/database/search?release_title=${title}&artist=${artist}&type=master&per_page=1&page=1`,
    );

    if (!response.ok) {
      throw new Error(`Error fetching master URL: ${response.status}`);
    }

    const data = await response.json();
    const master_url = data.results[0]?.master_url;

    if (!master_url) {
      throw new Error("Master URL not found");
    }

    // Get and return song metadata object
    const metadataResponse = await fetch(master_url);

    if (!metadataResponse.ok) {
      throw new Error(`Error fetching metadata: ${metadataResponse.status}`);
    }

    const metadataData = await metadataResponse.json();
    return metadataData;
  } catch (error) {
    console.error("An error occurred:", error.message);
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

/**
 * Artist metadata via artist id.
 * @returns {Object} artist metadata
 */
async function getArtistMetadata(artistId) {
  try {
    const artistResponse = await fetch(
      `https://api.discogs.com/artists/${artistId}`,
    );

    if (!artistResponse.ok) {
      throw new Error(
        `Error fetching artist results: ${artistResponse.status}`,
      );
    }

    const artistData = await artistResponse.json();

    if (!artistData) {
      throw new Error("Artist does not exist.");
    }

    return artistData;
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

async function displayMetadata(metadata, artistMetadata = null) {
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

  const profile = artistMetadata.profile.replace(/\[.*?\]/g, "").trim();
  document.getElementById("metadata").innerHTML = `
  <p>
    ${title ? `Title: ${title}<br>` : ""}
    ${artists.length > 0 ? `Artist: ${artists.join(", ")}<br>` : ""}
    ${labels.length > 0 ? `Label: ${labels.join(", ")}<br>` : ""}
    ${release ? `Released: ${release}\n` : ""}
    ${genres.length > 0 ? `Genre: ${genres.join(", ")}<br>` : ""}
    ${styles.length > 0 ? `Style: ${styles.join(", ")}<br>` : ""}
    ${extraArtists.length > 0 ? `Credits: ${extraArtists.join(", ")}<br>` : ""}
    <br>
    ${artistMetadata.realname ? `${artistMetadata.realname} - ` : ""}
    ${artistMetadata.profile ? `${profile}` : ""}
  </p>`;

  document.getElementById("loading-metadata").classList.add("hidden");
}

/**
 * Set background as blurred song cover art.
 */
function setBackgroundImage(imageUrl) {
  const backgroundDiv = document.getElementById("content");
  backgroundDiv.style.backgroundImage = `url('${imageUrl}')`;
}
