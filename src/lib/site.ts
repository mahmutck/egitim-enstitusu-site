export const whatsappNumber = "905055053420";
export const instagramUrl = "https://www.instagram.com/egitimenstitu/";
export const whatsappUrl = (message: string) =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

// Real public post permalinks pulled from @egitimenstitu — used for the
// official Instagram oEmbed widgets on the /instagram page.
export const instagramPosts = [
  "https://www.instagram.com/p/DD2OtrWtw6U/",
  "https://www.instagram.com/p/DPCGSu6jdnB/",
  "https://www.instagram.com/p/DbGo4QfRMdo/",
  "https://www.instagram.com/p/Da0FVHkKrqm/",
  "https://www.instagram.com/p/DaBupVDM9rF/",
];
