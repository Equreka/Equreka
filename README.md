<div align="center">

![Logo](./assets/brand/logo.png)


# Equreka 
[![Discord](https://img.shields.io/discord/812053915356364811?style=social&logo=discord&label=Discord&labelColor=f2f2f2)](https://discord.gg/NZypuxvAB6)
[![Twitter Follow](https://img.shields.io/twitter/follow/Equreka?style=social)](https://twitter.com/Equreka)
[![Sponsor](https://img.shields.io/github/sponsors/DerianAndre?style=social)](https://github.com/sponsors/DerianAndre)
[![GitHub](https://img.shields.io/github/license/Equreka/Equreka?color=green&label=License)](https://github.com//Equreka)

### Your free and open-source app for equations, formulas, constants, magnitudes, variables and units.

**Sponsor Equreka** https://github.com/sponsors/DerianAndre

</div>

#####

## You can help!
Join us at Discord: https://discord.gg/NZypuxvAB6


## Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build 
$ npm run start

# generate static project
$ npm run generate

# DEPRECATED - Moved from MongoDB/Mongoose to local content with nuxt-content
# update offline database (json files) API server must be online
# $ npm run update
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).

## Android build

```bash
# this will run all scripts needed and open android studio
$ npm run android

```
Please check out [Capacitor docs](https://capacitorjs.com/docs/v3/)

## Capacitor not working when launching App in Android Studio

Make sure `/android/app/build.gradle` have `aapOptions` like this:
```
android {
  ...
  defaultConfig {
    ...
    aaptOptions {
      ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
  }
}
```

## To-do

### Data
- [ ] SI basic units
- [ ] SI basic constants
- [ ] Get at least 100 mixed data
- [ ] Add subCategories or tags
### App
- [X] Use cappacitor.js to export as an app for iOS and Android (WIP)
- [ ] Beta test
### UI
- [X] Add content for everything
- [ ] Improve UX/UI (always doing it!)
### Calculator
- [X] Automatically create inputs, import function file and get constants
- [X] Error message system
- [X] Copy to clipboard
- [ ] Unit input for equations/formulas
- [X] Unit ratio conversion-system
- [ ] Unit formula conversion-system
### Scripts
- [X] Hover system for web
- [ ] Hover: Better hover system for app
- [X] Languages: Save in localStorage
- [X] Favorites: System with localStorage
- [X] Favorites: Add export
- [ ] Favorites: Add import
- [ ] Report system
### Code
- [ ] Clean code
- [ ] Optimizations and refactors