/** Aquads "How To...?" YouTube playlist — synced live via /api/tutorial-videos */
export const TUTORIAL_PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';

export const tutorialPlaylistUrl = `https://www.youtube.com/playlist?list=${TUTORIAL_PLAYLIST_ID}`;

export const watchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

export const thumbUrl = (videoId, size = 'mqdefault') =>
  `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
