# Scene 01 review

This branch changes the Dinosaur Island welcome screen. It uses the scene kit’s individual artwork at its supplied resolution. The approved composite and asset sheet are review references. The animation, responsive layout, dialogue and controls are rendered by the app.

## Test on an iPad

1. Open the development build in Safari. To preview before release, serve a checkout on a computer connected to the same Wi-Fi. Run `python3 -m http.server 8421` in the checkout and open `http://<computer-IP>:8421/` on the iPad.
2. In landscape, watch the full entrance. Check that the controls are visible throughout and that a quick **Start Adventure** tap opens the existing mission once. Return home and open **Grown-ups** during the entrance.
3. Save an adventure checkpoint, then return home. Check that **Continue Adventure** has visual priority and resumes the same stop and draft. Try **Start Adventure**, close the confirmation, and verify you can still continue. If you want to test confirming a restart, use a test checkpoint.
4. Rotate to portrait. Check the title, greeting and controls at normal and larger text sizes. Turn on **Reduce Motion** in iPad accessibility settings and check that the settled welcome appears immediately.
5. With VoiceOver or an attached keyboard, check that the title, Start, Continue when available, and Grown-ups controls can be reached and read.

## Automated checks

Run `npm test`. With Playwright installed and the project served under `/math-quest/`, run the welcome-specific and full-chapter browser checks:

```sh
CHAPTER_URL=http://127.0.0.1:8421/math-quest/ CHAPTER_SCREENSHOTS=/tmp/math-quest-welcome node tests/welcome-browser.mjs
CHAPTER_URL=http://127.0.0.1:8421/math-quest/ node tests/chapter-browser.mjs
```

Set `CHAPTER_BROWSER=webkit` to use the Playwright WebKit browser. The browser checks use isolated save data.
