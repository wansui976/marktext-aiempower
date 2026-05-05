import graphiteRedTheme from '../assets/themes/graphite-red.theme.css'
import graphiteBlackTheme from '../assets/themes/graphite-black.theme.css'
import graphiteBlueTheme from '../assets/themes/graphite-blue.theme.css'
import charcoalGreyTheme from '../assets/themes/charcoal-grey.theme.css'
import broadDaylightTheme from '../assets/themes/broad-daylight.theme.css'
import darkNightTheme from '../assets/themes/dark-night.theme.css'
import anxietyModeTheme from '../assets/themes/anxiety-mode.theme.css'
import gothamCityTheme from '../assets/themes/gotham-city.theme.css'
import draculaTheme from '../assets/themes/dracula.theme.css'
import toothpasteTheme from '../assets/themes/toothpaste.theme.css'
import cobaltBlueTheme from '../assets/themes/cobalt-blue.theme.css'
import deadLeafTheme from '../assets/themes/dead-leaf.theme.css'
import icefieldTheme from '../assets/themes/icefield.theme.css'
import moonlightTheme from '../assets/themes/moonlight.theme.css'
import tenGoldTheme from '../assets/themes/ten-gold.theme.css'
import ayuLightTheme from '../assets/themes/ayu-light.theme.css'
import ayuMirageTheme from '../assets/themes/ayu-mirage.theme.css'
import gandalfTheme from '../assets/themes/gandalf.theme.css'
import deerParkTheme from '../assets/themes/deer-park.theme.css'
import boringTheme from '../assets/themes/boring.theme.css'
import dayTheme from '../assets/themes/day.theme.css'
import nordTheme from '../assets/themes/nord.theme.css'
import notesLightTheme from '../assets/themes/notes-light.theme.css'
import notesDarkTheme from '../assets/themes/notes-dark.theme.css'
import lighthouseTheme from '../assets/themes/lighthouse.theme.css'
import rosePineTheme from '../assets/themes/rose-pine.theme.css'
import rosePineDawnTheme from '../assets/themes/rose-pine-dawn.theme.css'
import tokyoNightTheme from '../assets/themes/tokyo-night.theme.css'
import norwegianLightTheme from '../assets/themes/norwegian-light.theme.css'
import academicTheme from '../assets/themes/academic.theme.css'
import atomOneDarkTheme from '../assets/themes/atom-one-dark.theme.css'
import vinylTheme from '../assets/themes/vinyl.theme.css'
import catppuccinLatteTheme from '../assets/themes/catppuccin-latte.theme.css'
import catppuccinMacchiatoTheme from '../assets/themes/catppuccin-macchiato.theme.css'
import shibuyaJazzTheme from '../assets/themes/shibuya-jazz.theme.css'
import shibuyaLofiTheme from '../assets/themes/shibuya-lofi.theme.css'
import darkForestTheme from '../assets/themes/dark-forest.theme.css'
import clearRealmTheme from '../assets/themes/clear-realm.theme.css'

import darkPrismTheme from '../assets/themes/prismjs/dark.theme.css'

const themeMap = {
  'graphite-red': graphiteRedTheme,
  'graphite-black': graphiteBlackTheme,
  'graphite-blue': graphiteBlueTheme,
  'charcoal-grey': charcoalGreyTheme,
  'broad-daylight': broadDaylightTheme,
  'dark-night': darkNightTheme,
  'anxiety-mode': anxietyModeTheme,
  'gotham-city': gothamCityTheme,
  dracula: draculaTheme,
  toothpaste: toothpasteTheme,
  'cobalt-blue': cobaltBlueTheme,
  'dead-leaf': deadLeafTheme,
  icefield: icefieldTheme,
  moonlight: moonlightTheme,
  'ten-gold': tenGoldTheme,
  'ayu-light': ayuLightTheme,
  'ayu-mirage': ayuMirageTheme,
  gandalf: gandalfTheme,
  'deer-park': deerParkTheme,
  boring: boringTheme,
  day: dayTheme,
  nord: nordTheme,
  'notes-light': notesLightTheme,
  'notes-dark': notesDarkTheme,
  lighthouse: lighthouseTheme,
  'rose-pine': rosePineTheme,
  'rose-pine-dawn': rosePineDawnTheme,
  'tokyo-night': tokyoNightTheme,
  'norwegian-light': norwegianLightTheme,
  academic: academicTheme,
  'atom-one-dark': atomOneDarkTheme,
  vinyl: vinylTheme,
  'catppuccin-latte': catppuccinLatteTheme,
  'catppuccin-macchiato': catppuccinMacchiatoTheme,
  'shibuya-jazz': shibuyaJazzTheme,
  'shibuya-lofi': shibuyaLofiTheme,
  'dark-forest': darkForestTheme,
  'clear-realm': clearRealmTheme
}

export const darkThemes = new Set([
  'graphite-black', 'charcoal-grey', 'dark-night', 'anxiety-mode',
  'gotham-city', 'dracula', 'toothpaste', 'cobalt-blue', 'ten-gold',
  'ayu-mirage', 'nord', 'notes-dark', 'lighthouse', 'rose-pine',
  'tokyo-night', 'academic', 'atom-one-dark', 'catppuccin-macchiato',
  'shibuya-jazz', 'shibuya-lofi', 'dark-forest'
])

export const getThemeCss = (name) => {
  const css = themeMap[name]
  if (!css) return ''
  if (darkThemes.has(name)) {
    return css + '\n' + darkPrismTheme
  }
  return css
}
