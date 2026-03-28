/**
 * Aquads "How To...?" playlist — keep in sync when adding videos:
 * https://www.youtube.com/playlist?list=PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj
 * Feed for titles/order: https://www.youtube.com/feeds/videos.xml?playlist_id=PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj
 */
export const TUTORIAL_PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';

export const TUTORIAL_VIDEOS = [
  { id: 'r1yJMsdjoSc', title: 'How to Set Up Link in the Bio with Aquads' },
  { id: 'wEawp_-uv9c', title: 'How To Get Your On Chain Resume Minted' },
  { id: 'Ic2CncO9zKU', title: 'How to find the CV section' },
  { id: 'AURpcn9ybEI', title: 'How to Find the Skills Test' },
  { id: 'Bwo0h4uFdBA', title: 'How to use the Aquads Telegram Bot for Raiding' },
  { id: '4arbIjFGvPU', title: 'How to get the image URL' },
  { id: 'ygvi580jkwM', title: 'How to raid and earn' },
  { id: 'rQ-273Rj0i4', title: 'How to bump your bubbles' },
  { id: 'd2bjq7_nKQc', title: 'Get referral link' },
  { id: 'gt41bzMM6Fk', title: 'A List of Websites to Get An Image Url From' },
];

export const tutorialPlaylistUrl = `https://www.youtube.com/playlist?list=${TUTORIAL_PLAYLIST_ID}`;

export const watchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

export const thumbUrl = (videoId, size = 'mqdefault') =>
  `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
