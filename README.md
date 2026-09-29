# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

---

## 📷 Event Report PDF: Image Fitting & Rotation Solution Guide

This section explains how event photographs are automatically formatted, scaled, and auto-rotated in the institutional PDF report generator ([`src/utils/reportPdfGenerator.ts`](file:///c:/Users/aksha/Desktop/club-hub-admin/club-hub-admin/src/utils/reportPdfGenerator.ts)).

---

### 1. 📐 Image Fitting & Aspect-Ratio Configuration (2x2 Grid Template)

#### The Challenge:
When users upload event photos with different dimensions (portrait, landscape, square), putting them directly into a PDF template can cause stretching, warping, or layout overflow.

#### The Solution:
We implement a **2x2 Grid Template** (4 photos per page) using **Aspect-Ratio Preserving Letterboxing**:

1. **Bounding Box Allocation**:
   - Each card in the 2x2 grid allocates a fixed maximum width (`maxW`) and maximum height (`maxH`) for the photo.
2. **Aspect Ratio Preservation (`scaleToFit`)**:
   - Rather than forcing an image to stretch to the box size, we calculate the scale factor:
     $$\text{scale} = \min\left(\frac{\text{maxW}}{\text{originalWidth}}, \frac{\text{maxH}}{\text{originalHeight}}\right)$$
   - This maintains the exact native proportions of the photo without any stretching or cropping.
3. **Centered Alignment**:
   - The photo is centered horizontally and vertically within its container card:
     $$\text{Image X} = \text{Cell X} + \frac{\text{maxW} - \text{Scaled Width}}{2}$$
     $$\text{Image Y} = \text{Cell Y} + \frac{\text{maxH} - \text{Scaled Height}}{2}$$

---

### 2. 🔄 Auto-Rotation & EXIF Orientation Normalization

#### The Challenge (Why photos were rendering sideways):
Smartphone cameras (iOS / Android) do not rotate the physical pixel grid when you take a photo. Instead, they store raw unrotated pixels and attach a hidden **EXIF Orientation Tag** (e.g. Orientation 6 = 90° Clockwise) to the metadata.
When raw image files are directly passed to PDF generators (`pdf-lib`), the PDF renderer ignores EXIF tags, resulting in **sideways or upside-down photos**.

#### The Solution (`fetchNormalizedImageBytes`):
Before embedding photos into the PDF document, we route all image URLs through an **HTML5 Canvas Normalization Pass**:

```
[ Raw Uploaded Photo (with EXIF Tag) ]
                  │
                  ▼
      [ Load into HTML5 Image ]  ──► (Browser engine auto-corrects EXIF rotation)
                  │
                  ▼
   [ Draw onto 2D HTML5 Canvas ]  ──► (Bakes true upright pixels onto the Canvas)
                  │
                  ▼
 [ Export Clean JPEG/PNG Bytes ]  ──► (EXIF tag removed, 0° native orientation)
                  │
                  ▼
 [ Embed into PDF via pdf-lib ]  ──► (Renders 100% upright in Official Report!)
```

#### How to Explain This Simply to Anyone:
1. **The Problem**: *"Smartphones save rotated photos by attaching a hidden note to the file instead of turning the actual picture upright. PDF generators don't read that hidden note, so the photo appears sideways."*
2. **The Fix**: *"We run each photo through an HTML5 Canvas first. The browser reads the hidden note, turns the picture right-side up, and bakes it into clean pixels before embedding it into the PDF."*

---

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
