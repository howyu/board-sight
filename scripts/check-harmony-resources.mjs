import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

// These checked-in manifests use the JSON subset of JSON5.
const app = JSON.parse(readFileSync('harmony/AppScope/app.json5', 'utf8')).app
const module = JSON.parse(readFileSync('harmony/entry/src/main/module.json5', 'utf8')).module
const appMedia = 'harmony/AppScope/resources/base/media/'
const moduleMedia = 'harmony/entry/src/main/resources/base/media/'
function checkIcon(ref, label) {
  assert.match(ref ?? '', /^\$media:[a-zA-Z0-9_]+$/, `${label} must reference a media resource`)
  const name = ref.slice('$media:'.length)
  assert.ok(['svg', 'png'].some(ext =>
    existsSync(`${appMedia}${name}.${ext}`) || existsSync(`${moduleMedia}${name}.${ext}`)),
  `${label}: missing icon resource ${name}`)
}
checkIcon(app.icon, 'app.icon')
const colors = JSON.parse(readFileSync('harmony/entry/src/main/resources/base/element/color.json', 'utf8')).color
for (const ability of module.abilities) {
  checkIcon(ability.startWindowIcon, `${ability.name}.startWindowIcon`)
  assert.match(ability.startWindowBackground ?? '', /^\$color:[a-zA-Z0-9_]+$/)
  assert.ok(colors.some(color => color.name === ability.startWindowBackground.slice('$color:'.length)))
}
console.log('PASS required application and launch-window resource references')
