async function searchSong() {
  const yt_url = new URL(document.getElementById("url").value);
  const videoID = new URLSearchParams(yt_url.search).get("v");
  console.log(videoID);

  const title = await getTitle();
  const lyric = await getLyric(title);

  // Insert iframe of YouTube video
  const container = document.getElementById("video");
  container.innerHTML = `<iframe width="100%" height="100%" src="https://corsproxy.io/?url=https://www.youtube.com/embed/${videoID}" frameborder="0"></iframe>`;

  //Print out lyrics
  document.getElementById("lyric").innerHTML =
    "<p>" + lyric.replace(/\n/g, "<br>") + "</p>";
}

/**
 * Get title of YouTube video from noembed API
 */
async function getTitle() {
  const url = document.getElementById("url").value;

  return fetch(`https://noembed.com/embed?dataType=json&url=${url}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(`Title: ${data.title}`);
      return data.title;
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
