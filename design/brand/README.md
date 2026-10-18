# Brand: app icon, splash, favicon

The Key Solutions mark is a white bold **K** with a small cream dot at its lower right
(the "bit" of a key). It matches the login screen's `BrandMark`. Brand colour is berbere
`colors.primary` `#B23A1A`, and the dot is `colors.primarySoft` `#FBEDE7`.

## Files

| File | Size | What it is |
|---|---|---|
| `mark.svg` | vector | Master source. It is also the app icon design (full-bleed tile + mark). The K is a path, not text, so it renders the same on any machine. |
| `build.sh` | — | Renders every PNG below from `mark.svg`. Needs ImageMagick 7 (`magick`), nothing from npm. Output is byte-identical on every run. |
| `icon.png` | 1024 × 1024, opaque | iOS and default icon: berbere tile, mark centred. No transparency (App Store rule). |
| `android-icon-foreground.png` | 1024 × 1024, transparent | Android adaptive icon foreground. The mark fits inside the 66/108 safe circle (radius 313 px): the farthest point is about 250 px from centre, so no launcher mask clips it. |
| `android-icon-monochrome.png` | 1024 × 1024, transparent | Android 13+ themed icon. Same shape, one ink (the dot is white too). Android uses only the alpha. |
| `splash-icon.png` | 1024 × 1024, transparent | Splash image, shown on berbere. Fits inside Android 12+'s circular splash mask (radius ⅓ of the canvas). |
| `favicon.png` | 48 × 48 | Web tab icon: rounded berbere tile + mark. |

Change the mark → edit `mark.svg` → run `sh design/brand/build.sh` → look at the PNGs.
The mark's position and size per file are set by the `variant` lines in `build.sh`.

## Where each file goes (mobile agent)

Copy the PNGs into `mobile/assets/`, replacing the Expo defaults with the same names,
and delete `mobile/assets/android-icon-background.png` (the background is a flat colour
now). Then set `mobile/app.json` to:

```jsonc
{
  "expo": {
    "icon": "./assets/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/android-icon-foreground.png",
        "monochromeImage": "./assets/android-icon-monochrome.png",
        "backgroundColor": "#B23A1A"
        // remove "backgroundImage"
      }
    },
    "web": { "favicon": "./assets/favicon.png" },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#B23A1A"
        }
      ]
      // ...other plugins unchanged
    ]
  }
}
```

`#B23A1A` is `colors.primary`. JSON can't import `design/tokens.ts`. If the hex ever
changes, change it here too, or move to `app.config.ts` and import the token.

The splash shows a white K on berbere. Hide it (`SplashScreen.hideAsync()`) once fonts
and the session have loaded. The next screen is either the cream login screen with the
same mark on a tile, or the user's home screen.

Icon and splash changes only show in a new native build (EAS / `expo run:android`).
Expo Go always shows its own icon.
