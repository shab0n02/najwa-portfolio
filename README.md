# Najwa Waleed Qureshi | Portfolio

Personal portfolio of Najwa Waleed Qureshi, Mass Communication graduate in Advertising & PR (NUST, Dean’s Honour List).

It covers documentary and social campaigns, brand identity, B2B social content, product launches, reels, sales decks and photography.

It's a plain static site: HTML, CSS and a little JavaScript. There's no build step and nothing to install.

## Put it online with GitHub Pages

1. Create a new repository on GitHub. To get the address `https://<username>.github.io`, name the repository exactly `<username>.github.io`.
2. Upload everything in this folder to the repository: `index.html`, `css/`, `js/`, `assets/`, `.nojekyll` and this README.
   - In the browser: **Add file → Upload files**, drag the folder contents in, then **Commit changes**.
   - Or from a terminal:
     ```bash
     git init
     git add .
     git commit -m "Portfolio"
     git branch -M main
     git remote add origin https://github.com/<username>/<repo>.git
     git push -u origin main
     ```
3. In the repository, open **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then select `main` and `/ (root)`, and save.
4. After a minute or two the site is live at the address shown on that page.

## Preview it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Editing

- **Text:** everything lives in `index.html`. Each project is one `<article class="project">` block.
- **Colours and type:** set at the top of `css/style.css` (`--chili`, `--paper`, `--ink`, …).
- **Adding a carousel:** export its slides as `01.jpg`, `02.jpg`, … into a new folder under `assets/work/`. Then copy an existing `<button class="piece" data-gallery="…" data-count="…">` and point it at that folder.
- **Adding a reel:** put an H.264 `.mp4` and a poster `.jpg` in `assets/video/`, then copy one of the `<li>` blocks in the Reels section.

Keep images around 1350px on the long side and videos under 10 MB, so the site stays fast and well under GitHub's file limits.
