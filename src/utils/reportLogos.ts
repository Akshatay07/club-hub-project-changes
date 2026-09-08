// Vector SVG data URLs for DSCASC and Institution's Innovation Council (IIC) logos

export const DSCASC_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <!-- Outer Gold/Yellow Ring -->
  <circle cx="100" cy="100" r="96" fill="#eab308" stroke="#ca8a04" stroke-width="3"/>
  <circle cx="100" cy="100" r="88" fill="#fefce8" stroke="#1e3a8a" stroke-width="2"/>
  
  <!-- Outer Ring Text (Circular approximation) -->
  <path id="textPathTop" d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
  <path id="textPathBottom" d="M 175 100 A 75 75 0 0 1 25 100" fill="none" />
  
  <text font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#0f172a">
    <textPath href="#textPathTop" startOffset="50%" text-anchor="middle">
      DAYANANDA SAGAR COLLEGE OF ARTS, SCIENCE &amp; COMMERCE
    </textPath>
  </text>
  <text font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" fill="#0f172a">
    <textPath href="#textPathBottom" startOffset="50%" text-anchor="middle">
      ★ BANGALORE - 560078 ★
    </textPath>
  </text>

  <!-- Inner Blue Shield -->
  <circle cx="100" cy="100" r="62" fill="#1e3a8a" stroke="#ca8a04" stroke-width="2"/>
  
  <!-- Shield Shape inside -->
  <path d="M 68 72 Q 100 68 132 72 L 132 104 Q 132 128 100 138 Q 68 128 68 104 Z" fill="#0284c7" stroke="#fef08a" stroke-width="2"/>
  
  <!-- Stars & Lamp -->
  <circle cx="85" cy="85" r="3" fill="#fef08a"/>
  <circle cx="100" cy="80" r="4" fill="#fef08a"/>
  <circle cx="115" cy="85" r="3" fill="#fef08a"/>
  
  <!-- Flame / Torch -->
  <path d="M 100 88 Q 94 98 100 106 Q 106 98 100 88 Z" fill="#f59e0b"/>
  <path d="M 100 92 Q 97 98 100 103 Q 103 98 100 92 Z" fill="#fef08a"/>
  
  <!-- Open Book Symbol -->
  <path d="M 82 114 Q 100 110 100 118 Q 100 110 118 114 L 118 123 Q 100 119 100 126 Q 100 119 82 123 Z" fill="#ffffff" stroke="#1e3a8a" stroke-width="1"/>

  <!-- DSCASC Ribbon / Banner -->
  <rect x="68" y="142" width="64" height="15" rx="3" fill="#ca8a04" stroke="#1e3a8a" stroke-width="1"/>
  <text x="100" y="153" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">DSCASC</text>
</svg>`;

export const IIC_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="320" height="120">
  <!-- Gear / Flame Symbol on Left -->
  <g transform="translate(10, 10)">
    <!-- Gear base -->
    <circle cx="45" cy="50" r="38" fill="none" stroke="#1e3a8a" stroke-width="6" stroke-dasharray="12 6"/>
    <!-- Outer colorful nodes -->
    <circle cx="15" cy="30" r="7" fill="#ea580c"/>
    <circle cx="22" cy="75" r="6" fill="#0284c7"/>
    <circle cx="75" cy="75" r="7" fill="#f59e0b"/>
    <circle cx="75" cy="25" r="6" fill="#16a34a"/>
    
    <!-- Central Dynamic Swoosh / Flame -->
    <path d="M 32 68 C 25 45 42 32 50 18 C 55 35 70 42 62 65 C 55 52 42 55 32 68 Z" fill="#ea580c"/>
    <path d="M 40 64 C 36 50 48 40 52 30 C 56 42 65 48 58 62 C 52 54 45 55 40 64 Z" fill="#f59e0b"/>
    <circle cx="50" cy="18" r="5" fill="#1e3a8a"/>
  </g>

  <!-- Typography on Right -->
  <text x="105" y="38" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="900" fill="#1e3a8a" letter-spacing="0.5">
    INSTITUTION'S
  </text>
  <text x="105" y="56" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="900" fill="#1e3a8a" letter-spacing="0.5">
    INNOVATION
  </text>
  <text x="105" y="74" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="900" fill="#1e3a8a" letter-spacing="0.5">
    COUNCIL
  </text>
  <text x="105" y="90" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="bold" fill="#b91c1c">
    (Ministry of Education Initiative)
  </text>
</svg>`;

// Convert SVG to Data URL Image Element for jsPDF
export function svgToDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width || 300;
        canvas.height = image.height || 300;
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0);
          const pngData = canvas.toDataURL("image/png");
          URL.revokeObjectURL(blobURL);
          resolve(pngData);
        } else {
          URL.revokeObjectURL(blobURL);
          resolve("");
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(blobURL);
        resolve("");
      };
      image.src = blobURL;
    } catch {
      resolve("");
    }
  });
}
