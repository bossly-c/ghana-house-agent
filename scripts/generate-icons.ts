// scripts/generate-icons.ts
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Creates a simple branded PNG icon
async function makeIcon(size: number, filename: string) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" 
         xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#0c3b2e"/>
      
      <!-- House shape -->
      <g transform="translate(${size * 0.5}, ${size * 0.48})">
        <!-- Roof -->
        <polygon 
          points="${-size * 0.32},${-size * 0.05} 0,${-size * 0.32} ${size * 0.32},${-size * 0.05}" 
          fill="#f2b70a"/>
        <!-- Walls -->
        <rect 
          x="${-size * 0.24}" y="${-size * 0.06}" 
          width="${size * 0.48}" height="${size * 0.28}" 
          fill="#ffffff"/>
        <!-- Door -->
        <rect 
          x="${-size * 0.07}" y="${size * 0.1}" 
          width="${size * 0.14}" height="${size * 0.12}" 
          rx="${size * 0.02}" fill="#0c3b2e"/>
        <!-- Left window -->
        <rect 
          x="${-size * 0.2}" y="${size * 0.01}" 
          width="${size * 0.1}" height="${size * 0.1}" 
          rx="${size * 0.01}" fill="#f2b70a" opacity="0.8"/>
        <!-- Right window -->
        <rect 
          x="${size * 0.1}" y="${size * 0.01}" 
          width="${size * 0.1}" height="${size * 0.1}" 
          rx="${size * 0.01}" fill="#f2b70a" opacity="0.8"/>
      </g>
      
      <!-- GHA text at bottom -->
      <text 
        x="${size * 0.5}" 
        y="${size * 0.88}" 
        font-family="Arial Black, Arial" 
        font-size="${size * 0.13}" 
        font-weight="900"
        fill="#f2b70a" 
        text-anchor="middle"
        letter-spacing="${size * 0.015}">GHA</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(filename);

  console.log(`✅ Created ${filename}`);
}

async function main() {
  await makeIcon(512, "public/icons/icon-512.png");
  await makeIcon(192, "public/icons/icon-192.png");
  console.log("\n🎉 Icons generated in public/icons/");
}

main().catch(console.error);