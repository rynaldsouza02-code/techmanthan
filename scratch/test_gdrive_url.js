function getDirectImageUrl(url) {
  if (!url) return "";
  const cleaned = url.trim();
  const gdriveMatch = cleaned.match(/drive\.google\.com\/file\/d\/([^\/]+)/i) || cleaned.match(/drive\.google\.com\/uc\?.*id=([^\&]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }
  return cleaned;
}

console.log("Drive URL 1:", getDirectImageUrl("https://drive.google.com/file/d/1vMZ1nvkazpVzn0UEHgK9Sq63Qu4_fas0/view?usp=drive_link"));
console.log("Unsplash URL:", getDirectImageUrl("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"));
