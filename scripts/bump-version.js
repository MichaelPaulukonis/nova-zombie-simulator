#!/usr/bin/env node
'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PKG_PATH = path.join(__dirname, '..', 'package.json')
const DRY_RUN = process.argv.includes('--dry-run')

function run (cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function assertCleanWorkingTree () {
  const status = run('git status --porcelain')
  if (status.length > 0) {
    console.error('bump-version: working tree is dirty, refusing to bump.\n' + status)
    process.exit(1)
  }
}

function lastTag () {
  try {
    return run('git describe --tags --abbrev=0')
  } catch (err) {
    return null
  }
}

// Records are separated by \x03, hash/message within a record by \x00 -
// both are control chars that won't appear in normal commit messages.
function commitMessagesSince (tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  const raw = run(`git log ${range} --pretty=format:%H%x00%B%x03`)
  if (!raw) return []
  return raw.split('\x03').filter(Boolean).map(entry => {
    const [hash, message] = entry.split('\x00')
    return { hash, message: message.trim() }
  })
}

function classifyBump (messages) {
  let hasFeat = false
  for (const { message } of messages) {
    const firstLine = message.split('\n')[0]
    if (/^\w+(\(.+\))?!:/.test(firstLine) || /BREAKING CHANGE/.test(message)) {
      return 'major'
    }
    if (/^feat(\(.+\))?:/.test(firstLine)) {
      hasFeat = true
    }
  }
  return hasFeat ? 'minor' : 'patch'
}

function bumpVersion (version, level) {
  if (!version) {
    throw new Error('bump-version: package.json has no "version" field')
  }
  const [major, minor, patch] = version.split('.').map(Number)
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    throw new Error(`bump-version: cannot parse version "${version}" as major.minor.patch`)
  }
  if (level === 'major') return `${major + 1}.0.0`
  if (level === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function main () {
  assertCleanWorkingTree()

  const tag = lastTag()
  const messages = commitMessagesSince(tag)

  if (messages.length === 0) {
    console.log('bump-version: nothing to release, skipping.')
    return
  }

  let pkg
  try {
    pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
  } catch (err) {
    throw new Error(`bump-version: failed to read/parse package.json: ${err.message}`)
  }
  const level = classifyBump(messages)
  const newVersion = bumpVersion(pkg.version, level)

  console.log(`bump-version: ${pkg.version} -> ${newVersion} (${level}, ${messages.length} commit(s) since ${tag || 'repo start'})`)

  if (DRY_RUN) {
    console.log('bump-version: --dry-run, not writing changes.')
    return
  }

  pkg.version = newVersion
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n')

  let committed = false
  try {
    run('git add package.json')
    run(`git commit -m "chore(release): v${newVersion}"`)
    committed = true
    run(`git tag -a v${newVersion} -m "v${newVersion}"`)
  } catch (err) {
    if (committed) {
      throw new Error(`bump-version: commit succeeded but tagging failed, HEAD now has an untagged release commit - fix manually: ${err.message}`)
    }
    run('git checkout HEAD -- package.json')
    throw new Error(`bump-version: git step failed, reverted package.json: ${err.message}`)
  }

  console.log(`bump-version: tagged v${newVersion}. Push with: git push --follow-tags`)
}

try {
  main()
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
