Notepad → PDF Pro
A browser-based notepad that creates PDF files on iPhone/iPad Safari, Android, and desktop browsers.
What is included
iPhone/iPad-friendly Save / Share PDF flow
Safari fallback that opens the PDF for Share → Save to Files
Responsive mobile layout with safe-area support
16 px mobile form controls to reduce unwanted Safari input zoom
Autosaved draft and settings in browser `localStorage`
Installable PWA files: manifest, icons, and service worker
Relative paths so the site works in a GitHub Pages repository subfolder
Free Plain and Ruled Notepad templates
Optional Vercel Stripe checkout for the four Pro templates
Folder structure
```text
notepad-pdf-iphone-web/
├── index.html
├── app.js
├── pdfTemplates.js
├── manifest.webmanifest
├── service-worker.js
├── vercel.json
├── .nojekyll
├── .env.example
├── api/
│   ├── config.js
│   ├── create-checkout-session.js
│   └── verify-session.js
└── icons/
    ├── apple-touch-icon.png
    ├── icon-192.png
    └── icon-512.png
```
Test locally
Do not double-click `index.html` and run it as a `file://` page. Use a local web server.
From the project folder:
```bash
python -m http.server 8080
```
Then open:
```text
http://localhost:8080
```
Stripe API routes will not run in this simple local server, but PDF creation and the free templates will work.
Deploy to GitHub Pages
GitHub Pages is suitable for the static app and free templates. Its static hosting does not run the Vercel `/api` functions, so Stripe checkout remains disabled there.
Create a new GitHub repository.
Upload the contents of this folder to the repository root.
Commit the files.
Open Settings → Pages.
Under Build and deployment, select Deploy from a branch.
Select your main branch and the `/ (root)` folder.
Save and wait for the Pages address.
The relative links and `./` manifest scope are already set for a URL such as:
```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```
Deploy to Vercel
Vercel supports both the static frontend and the included `/api` server functions.
Push this folder to a GitHub repository.
In Vercel, choose Add New → Project.
Import the repository.
Leave the framework preset as Other if Vercel does not choose one automatically.
Deploy.
PDF creation works without environment variables.
Optional: connect Stripe on Vercel
Create a one-time Stripe product/price for $9, then add these environment variables in the Vercel project:
```text
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_PRICE_ID=price_your_price_id
```
Redeploy after adding the variables. The app will detect the API configuration and enable Continue to Stripe.
Use Stripe test keys and a test Price ID while testing.
Test on iPhone or iPad
Open the deployed HTTPS address in Safari.
Enter text.
Tap Save / Share PDF.
Choose Save to Files, AirDrop, Mail, or another destination.
To install it, use Safari Share → Add to Home Screen.
If file sharing is unavailable, the app opens the PDF in Safari. Tap Safari's Share button and choose Save to Files.
Notes
The PDF library is loaded from a pinned jsPDF CDN version. The service worker can cache it after a successful online load, but the first load needs internet access.
Drafts and the Pro-unlocked flag are stored only in that browser's local storage. Clearing Safari website data removes them.
The client-side Pro lock is a lightweight convenience gate, not strong digital-rights enforcement, because the template code is delivered to the browser.
The built-in PDF fonts are best for English and other Latin-script text. Full Telugu or other complex-script PDF support requires adding an appropriate embedded Unicode font and shaping support.
