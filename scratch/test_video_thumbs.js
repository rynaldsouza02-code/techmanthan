const https = require('https');

const videoFileIds = [
  "1xQJE0EhIkya7RJ1dLDrOGfaVhfay_lkq",
  "1yWDPDcf8A-7BgvQzrYJdRiCr72nVOdhn",
  "1pJmL4WNRJHulCNEEX_H5YWZhPFqJuAH1"
];

videoFileIds.forEach(id => {
  const thumbUrl = `https://lh3.googleusercontent.com/d/${id}`;
  https.get(thumbUrl, res => {
    console.log(id, "-> status:", res.statusCode, "type:", res.headers['content-type'], "location:", res.headers['location'] || "none");
  });
});
