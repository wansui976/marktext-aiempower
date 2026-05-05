import App from '@/pages/app'
import Preference from '@/pages/preference'

const General = () => import(/* webpackChunkName: "pref" */ '@/prefComponents/general')
const Editor = () => import(/* webpackChunkName: "pref" */ '@/prefComponents/editor')
const Markdown = () => import(/* webpackChunkName: "pref" */ '@/prefComponents/markdown')
const SpellChecker = () => import(/* webpackChunkName: "pref" */ '@/prefComponents/spellchecker')
const Theme = () => import(/* webpackChunkName: "pref-theme" */ '@/prefComponents/theme')
const Image = () => import(/* webpackChunkName: "pref" */ '@/prefComponents/image')
const Keybindings = () => import(/* webpackChunkName: "pref" */ '@/prefComponents/keybindings')

const parseSettingsPage = type => {
  let pageUrl = '/preference'
  if (/\/spelling$/.test(type)) {
    pageUrl += '/spelling'
  }
  return pageUrl
}

const routes = type => ([{
  path: '/', redirect: type === 'editor' ? '/editor' : parseSettingsPage(type)
}, {
  path: '/editor', component: App
}, {
  path: '/preference',
  component: Preference,
  children: [{
    path: '', component: General
  }, {
    path: 'general', component: General, name: 'general'
  }, {
    path: 'editor', component: Editor, name: 'editor'
  }, {
    path: 'markdown', component: Markdown, name: 'markdown'
  }, {
    path: 'spelling', component: SpellChecker, name: 'spelling'
  }, {
    path: 'theme', component: Theme, name: 'theme'
  }, {
    path: 'image', component: Image, name: 'image'
  }, {
    path: 'keybindings', component: Keybindings, name: 'keybindings'
  }]
}])

export default routes
