import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const sourceRoots = ['guide', 'rogue-memory', 'performance', 'article']
const missing = []

function collectMarkdownFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory()
      ? collectMarkdownFiles(path)
      : path.endsWith('.md')
        ? [path]
        : []
  })
}

for (const sourceRoot of sourceRoots) {
  for (const source of collectMarkdownFiles(join(root, sourceRoot))) {
    const localized = join(root, 'en', relative(root, source))
    if (!existsSync(localized)) missing.push(relative(root, localized))
  }
}

if (!existsSync(join(root, 'en/index.md'))) missing.push('en/index.md')

if (missing.length) {
  console.error(`Missing English pages:\n${missing.join('\n')}`)
  process.exit(1)
}

console.log('English locale mirrors every published Chinese page.')
