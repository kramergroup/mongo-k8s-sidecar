import config from './lib/config.js'
console.log("Running tests")
config.ownIPs.some( ip => ip === '127.0.0.1' )