#!/bin/sh
# Renders every brand PNG from mark.svg. Needs ImageMagick 7 (`magick`); no npm packages.
# Run from anywhere:  sh design/brand/build.sh
set -eu
cd "$(dirname "$0")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

MARK_TRANSFORM='translate(64 64) scale(0.56) translate(-57 -58)'

# variant <name> <scale> <tile: yes|no> <ink: white|black>
variant() {
  sed -e "s|transform=\"$MARK_TRANSFORM\"|transform=\"translate(64 64) scale($2) translate(-57 -58)\"|" mark.svg > "$TMP/$1.svg"
  if [ "$3" = no ]; then
    sed -i '' -e '/id="tile"/d' "$TMP/$1.svg"
  fi
  if [ "$4" = mono ]; then
    # Android monochrome icon: one ink, alpha carries the shape.
    sed -i '' -e 's|#FBEDE7|#FFFFFF|' "$TMP/$1.svg"
  fi
}

# Render at 4x then downsample: ImageMagick's internal SVG renderer antialiases
# edges much better this way.
render() { # <svg> <out.png> <px>
  magick -background none -density 384 "$1" -resize "$3x$3" -strip PNG32:"$2"
}

variant icon        0.56 yes color   # iOS / default icon: full-bleed tile
variant foreground  0.38 no  color   # Android adaptive foreground: inside 66/108 safe circle
variant monochrome  0.38 no  mono    # Android 13 themed icon
variant splash      0.48 no  color   # splash image on colors.primary; inside the Android 12+ circle mask
variant favicon     0.62 yes color   # web tab icon

render "$TMP/icon.svg"       icon.png                  1024
render "$TMP/foreground.svg" android-icon-foreground.png 1024
render "$TMP/monochrome.svg" android-icon-monochrome.png 1024
render "$TMP/splash.svg"     splash-icon.png           1024
render "$TMP/favicon.svg"    favicon.png               48

# The favicon gets rounded corners (browsers don't mask it).
magick favicon.png \( -size 48x48 xc:none -fill white -draw 'roundrectangle 0,0 47,47 11,11' \) \
  -compose DstIn -composite -strip PNG32:favicon.png

# icon.png must have no transparency (App Store rule): flatten onto the tile color.
magick icon.png -background '#B23A1A' -alpha remove -alpha off -strip PNG24:icon.png

ls -l *.png
