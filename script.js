// Set default url on page load
window.onload = function () {
  document.getElementById("search").click();
};

/**
 * Toggle user's search preference between (youtube url) and (release and artist name).
 */
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

/**
 * Main function to search for song when form is submitted.
 * @param {*} event
 */
async function searchSong(event) {
  event.preventDefault();
  resetElements();

  const inputType = document.getElementById("input-type").value;

  let title, artist, ytUrl, videoID, artistMetadata, msg;

  try {
    if (
      // Search via YouTube URL
      inputType === "url"
    ) {
      ytUrl = new URL(document.getElementById("url").value);
      videoID = ytUrl.searchParams.get("v");

      title = await getTitleByYoutubeUrl(ytUrl);
      if (!title) {
        removeLoadingElements();
        msg = "Failed to load video";
        document.getElementById("loading-video-error").innerHTML = msg;
        document
          .getElementById("loading-video-error")
          .classList.remove("hidden");
        throw new Error(msg);
      }

      insertIframe(videoID);

      // Get and print metadata
      await getMetadataByYoutubeTitle(title).then(async (data) => {
        if (!data) {
          removeLoadingElements();
          msg = "Metadata does not exist by YouTube title";
          document.getElementById("loading-metadata-error").innerHTML = msg;
          document
            .getElementById("loading-metadata-error")
            .classList.remove("hidden");
          throw new Error(msg);
        }

        if (data.images[0].uri) {
          setBackgroundImage(data.images[0].uri);
        }

        artistMetadata = await getArtistMetadata(data.artists[0].id);
        if (!artistMetadata) {
          msg = "Artist metadata does not exist";
          console.error(msg);
        }

        displayMetadata(data, artistMetadata);
      });
    } else // Search via song and artist name
    {
      title = document.getElementById("title-input").value;
      artist = document.getElementById("artist-input").value;

      // Get and print metadata
      await getMetadataBySongAndArtist(title, artist).then(async (data) => {
        if (!data) {
          removeLoadingElements();
          msg = "Metadata not found by release and artist search";
          document.getElementById("loading-metadata-error").innerHTML = msg;
          document
            .getElementById("loading-metadata-error")
            .classList.remove("hidden");
          alert("Release and artist does not exist. Please try a new search");
          throw new Error(msg);
        }

        if (!data.videos) {
          removeLoadingElements();
          msg = "YouTube video does not exist via discogs";
          document.getElementById("loading-video-error").innerHTML = msg;
          document
            .getElementById("loading-video-error")
            .classList.remove("hidden");
          throw new Error(msg);
        }

        ytUrl = new URL(data.videos[0].uri);
        videoID = ytUrl.searchParams.get("v");

        insertIframe(videoID);

        if (data.images[0].uri) {
          setBackgroundImage(data.images[0].uri);
        }

        artistMetadata = await getArtistMetadata(data.artists[0].id);
        displayMetadata(data, artistMetadata);
      });
    }
    // Get and print lyrics
    const lyric = await getLyric(title, artist);
    if (!lyric) {
      removeLoadingElements();
      msg = "No lyrics found";
      document.getElementById("loading-lyric-error").innerHTML = msg;
      document.getElementById("loading-lyric-error").classList.remove("hidden");
      throw new Error(msg);
    }

    document.getElementById("loading-lyric").classList.add("hidden");

    document.getElementById("lyric").innerHTML =
      "<p>" + lyric.replace(/\n/g, "<br>") + "</p>";
  } catch (error) {
    console.error("An error occured: ", error.stack);
  }
}

/**
 * Reset HTML elements.
 */
function resetElements() {
  document.getElementById("video").innerHTML = "";
  document.getElementById("loading-video").classList.remove("hidden");
  document.getElementById("loading-video-error").classList.add("hidden");

  document.getElementById("metadata").innerHTML = "";
  document.getElementById("loading-metadata").classList.remove("hidden");
  document.getElementById("loading-metadata-error").classList.add("hidden");

  document.getElementById("lyric").innerHTML = "";
  document.getElementById("loading-lyric").classList.remove("hidden");
  document.getElementById("loading-lyric-error").classList.add("hidden");

  document.getElementById("content").style.backgroundImage = "none";
}

/**
 * Remove loading messages.
 */
function removeLoadingElements() {
  document.getElementById("loading-video").classList.add("hidden");
  document.getElementById("loading-metadata").classList.add("hidden");
  document.getElementById("loading-lyric").classList.add("hidden");
}

/**
 * Get title of YouTube video from noembed API.
 * @param {URL} url
 * @returns {string} Cleaned title of YouTube video
 */
async function getTitleByYoutubeUrl(url) {
  try {
    const response = await fetch(
      `https://noembed.com/embed?dataType=json&url=${url}`,
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    const formattedTitle = data.title.replace(/\(.*?\)/g, "").trim();

    return formattedTitle;
  } catch (error) {
    console.error("Failed to fetch title:", error);
    throw error;
  }
}

/**
 * Insert iframe of YouTube video.
 * @param {string} videoID
 */
function insertIframe(videoID) {
  try {
    const container = document.getElementById("video");
    container.innerHTML = `<iframe width="100%" height="100%" src="https://corsproxy.io/?url=https://www.youtube.com/embed/${videoID}" frameborder="0"></iframe>`;

    document.getElementById("loading-video").classList.add("hidden");
  } catch (error) {
    console.error("An error occurred: ", error.message);
    document.getElementById("loading-video-error").innerHTML = "error";
    document.getElementById("loading-video-error").classList.remove("hidden");
  }
}

/**
 * Search LRCLIB API via song title and return lyric.
 * @param {string} title
 * @param {string} artist
 * @returns
 */
async function getLyric(title, artist = null) {
  try {
    let response;

    if (artist) {
      response = await fetch(
        `https://lrclib.net/api/get?track_name=${title}&artist_name=${artist}`,
      );
    } else {
      response = await fetch(
        `https://lrclib.net/api/search?track_name=${title}`,
      );
    }

    const data = await response.json();

    // Check if lyrics exist
    const lyrics = artist ? data.plainLyrics : data[0]?.plainLyrics;
    if (!lyrics) {
      throw new Error(
        `No lyrics found: ${title}${artist ? " by " + artist : ""}`,
      );
    }

    // Clean lyrics
    return lyrics.replace(/\[.*?\]/g, "").trim();
  } catch (error) {
    return undefined;
  }
}

/**
 * Get song metadata via discogs API search via song title and artist name.
 * @param {string} title
 * @param {string} artist
 * @returns {Object} Song metadata
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
 * Get song metadata via discogs API search query.
 * @param {string} title
 * @returns {Object} Song metadata
 */
async function getMetadataByYoutubeTitle(title) {
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
    console.log("Master ID: ", masterId);
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
 * Get artist metadata via artist id.
 * @param {*} artistId
 * @returns {Object} Artist metadata
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

/**
 * Display song and artist metadata onto HTML.
 * @param {Object} metadata
 * @param {Object} artistMetadata
 */
async function displayMetadata(metadata, artistMetadata = null) {
  let title = metadata.title;
  console.log(`Title: ${title}`);

  let artists = [];
  for (artist in metadata.artists) {
    artists.push(metadata.artists[artist].name);
  }

  let labels = [];
  for (label in metadata.labels) {
    labels.push(metadata.labels[label].name);
  }

  let release = metadata.released;

  let year = metadata.year;

  let genres = [];
  for (genre in metadata.genres) {
    genres.push(metadata.genres[genre]);
  }

  let styles = [];
  for (style in metadata.styles) {
    styles.push(metadata.styles[style]);
  }

  let extraArtists = [];
  for (artist in metadata.extraartists) {
    extraArtists.push(
      `${metadata.extraartists[artist].role} – ${metadata.extraartists[artist].name}`,
    );
  }

  let masterId = metadata.id;
  let numForSale = parseInt(metadata.num_for_sale);
  let lowestPrice = parseFloat(metadata.lowest_price).toFixed(2);

  const profile = artistMetadata.profile.replace(/\[.*?\]/g, "").trim();

  document.getElementById("metadata").innerHTML = `
  <p>
    ${title ? `Title: ${title}<br>` : ""}
    ${artists.length > 0 ? `Artist: ${artists.join(", ")}<br>` : ""}
    ${labels.length > 0 ? `Label: ${labels.join(", ")}<br>` : ""}
    ${release ? `Released: ${release}<br>` : ""}
    ${year ? `Year: ${year}<br>` : ""}
    ${genres.length > 0 ? `Genre: ${genres.join(", ")}<br>` : ""}
    ${styles.length > 0 ? `Style: ${styles.join(", ")}<br>` : ""}
    ${extraArtists.length > 0 ? `Credits: ${extraArtists.join(", ")}<br>` : ""}
    ${lowestPrice ? `<a href="https://www.discogs.com/sell/list?master_id=${masterId}" class="link" target="_blank" rel="noopener noreferrer">${numForSale} release listing${numForSale === 1 ? "" : "s"} from $${lowestPrice}</a><br>` : ""}
    <br>
    ${artistMetadata.realname ? `${artistMetadata.realname} - ` : ""}
    ${artistMetadata.profile ? `${profile}` : ""}
  </p>`;

  document.getElementById("loading-metadata").classList.add("hidden");
}

/**
 * Set background as blurred song cover art.
 * @param {string} imageUrl
 */
function setBackgroundImage(imageUrl) {
  const backgroundDiv = document.getElementById("content");
  backgroundDiv.style.backgroundImage = `url('${imageUrl}')`;
}
