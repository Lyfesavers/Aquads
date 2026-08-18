// Shared copy for paid PR / Mintfunnel placements.
// FTC Endorsement Guides (16 CFR Part 255) and Mintfunnel publisher terms
// require a clear, conspicuous "Sponsored" / "Ad" label — "Press Release"
// alone is not enough, because readers may still treat it as independent news.

export const PRESS_RELEASE_LABEL = 'Sponsored Press Release';

export const PRESS_RELEASE_DISCLAIMER =
  'This is a paid press release. It was provided by a third party for distribution on Aquads and is not independent editorial content. The views expressed are those of the issuing company and do not necessarily reflect those of Aquads. This is not financial advice.';

export const isPressReleasePost = (blog) => Boolean(blog?.isPressRelease);
