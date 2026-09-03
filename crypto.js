"use strict";

function makeLockCode() {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes = new Uint8Array(10);
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
      let output = "";
      for (const byte of bytes) output += alphabet[byte % alphabet.length];
      return `${output.slice(0, 5)}-${output.slice(5)}`;
    }

    function rotateRight(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }

    function sha256Fallback(text) {
      const input = encoder.encode(text);
      const bitLength = input.length * 8;
      const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
      const data = new Uint8Array(paddedLength);
      data.set(input);
      data[input.length] = 0x80;
      const view = new DataView(data.buffer);
      view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
      view.setUint32(paddedLength - 4, bitLength >>> 0, false);

      const k = new Uint32Array([
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
      ]);
      const h = new Uint32Array([
        0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
        0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
      ]);
      const w = new Uint32Array(64);

      for (let offset = 0; offset < paddedLength; offset += 64) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
        for (let i = 16; i < 64; i++) {
          const s0 = rotateRight(w[i - 15], 7) ^ rotateRight(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          const s1 = rotateRight(w[i - 2], 17) ^ rotateRight(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let a=h[0], b=h[1], c=h[2], d=h[3], e=h[4], f=h[5], g=h[6], hh=h[7];
        for (let i = 0; i < 64; i++) {
          const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
          const ch = (e & f) ^ (~e & g);
          const t1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
          const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
          const maj = (a & b) ^ (a & c) ^ (b & c);
          const t2 = (s0 + maj) >>> 0;
          hh=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
        }

        h[0]=(h[0]+a)>>>0; h[1]=(h[1]+b)>>>0; h[2]=(h[2]+c)>>>0; h[3]=(h[3]+d)>>>0;
        h[4]=(h[4]+e)>>>0; h[5]=(h[5]+f)>>>0; h[6]=(h[6]+g)>>>0; h[7]=(h[7]+hh)>>>0;
      }

      const output = new Uint8Array(32);
      const outputView = new DataView(output.buffer);
      h.forEach((value, index) => outputView.setUint32(index * 4, value, false));
      return output;
    }

    async function sha256Bytes(text) {
      if (globalThis.crypto && globalThis.crypto.subtle) {
        const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(text));
        return new Uint8Array(digest);
      }
      return sha256Fallback(text);
    }

    async function sha256Hex(text) {
      const bytes = await sha256Bytes(text);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    async function deterministicShuffle(items, seed) {
      const output = [...items];
      let pool = new Uint8Array(0);
      let cursor = 0;
      let block = 0;

      async function nextUint32() {
        if (cursor + 4 > pool.length) {
          pool = await sha256Bytes(`${seed}|block:${block++}`);
          cursor = 0;
        }
        const value = (
          pool[cursor] * 0x1000000 +
          pool[cursor + 1] * 0x10000 +
          pool[cursor + 2] * 0x100 +
          pool[cursor + 3]
        ) >>> 0;
        cursor += 4;
        return value;
      }

      for (let i = output.length - 1; i > 0; i--) {
        const range = i + 1;
        const limit = Math.floor(0x100000000 / range) * range;
        let value;
        do { value = await nextUint32(); } while (value >= limit);
        const j = value % range;
        [output[i], output[j]] = [output[j], output[i]];
      }
      return output;
    }
