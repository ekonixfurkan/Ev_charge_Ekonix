// Kullanım: node scripts/hash-password.mjs ad@firma.com [şifre]
// Çıktıyı Vercel'de AUTH_USERS değişkenine ekleyin (birden fazla kullanıcı ";" ile ayrılır).
import { createInterface } from 'node:readline';
import { hashPassword } from '../lib/password.js';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email.includes('@')) {
  console.error('Kullanım: node scripts/hash-password.mjs ad@firma.com [şifre]');
  process.exit(1);
}

async function ask(q) {
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) return line;
    return '';
  }
  process.stderr.write(q);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    let s = '';
    process.stdin.on('data', function on(ch) {
      for (const c of ch) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', on);
          process.stderr.write('\n'); return resolve(s);
        }
        if (c === '\u0003') process.exit(130);
        if (c === '\u007f') s = s.slice(0, -1); else s += c;
      }
    });
  });
}

const password = process.argv[3] ?? await ask('Şifre: ');
if (password.length < 10) {
  console.error('Şifre en az 10 karakter olmalı.');
  process.exit(1);
}
console.log(`${email}:${await hashPassword(password)}`);
