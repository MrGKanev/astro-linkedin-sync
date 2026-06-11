// Build a tiny synthetic LinkedIn export ZIP for smoke-testing the CLI.
// Uses Node's built-in zlib + a hand-rolled minimal ZIP writer to avoid
// pulling in an archiver dep for tests.
import { writeFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const records = [];
  const central = [];
  let offset = 0;
  for (const { name, content } of files) {
    const data = Buffer.from(content, "utf8");
    const deflated = deflateRawSync(data);
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // method = deflate
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0, 12); // date
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc32(data), 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);

    records.push(local, nameBuf, deflated);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + deflated.length;
  }
  const centralBuf = Buffer.concat(central);
  const centralOffset = offset;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...records, centralBuf, eocd]);
}

const files = [
  {
    name: "Profile.csv",
    content:
      `First Name,Last Name,Headline,Summary,Industry,Geo Location,Websites,Twitter Handles\n` +
      `Gabriel,Kanev,"Senior dev","Building useful stuff.",Software,"Sofia, Bulgaria","https://example.com",@gkanev\n`,
  },
  {
    name: "Positions.csv",
    content:
      `Company Name,Title,Description,Location,Started On,Finished On\n` +
      `"Acme Inc",Engineer,"Did things",Sofia,Jan 2022,Present\n` +
      `"OldCo",Junior dev,"Learned things",Remote,Jun 2019,Dec 2021\n`,
  },
  {
    name: "Education.csv",
    content:
      `School Name,Degree Name,Field of Study,Start Date,End Date,Activities,Notes\n` +
      `Sofia University,BSc,Computer Science,Sep 2015,Jun 2019,"Robotics club",""\n`,
  },
  {
    name: "Skills.csv",
    content: `Name\nTypeScript\nAstro\nNode.js\n`,
  },
  {
    name: "Certifications.csv",
    content:
      `Name,Authority,License Number,Started On,Finished On,Url\n` +
      `AWS Solutions Architect,Amazon,XYZ123,Mar 2023,Mar 2026,https://aws.amazon.com/verify\n`,
  },
  {
    name: "Languages.csv",
    content: `Name,Proficiency\nBulgarian,Native\nEnglish,Professional\n`,
  },
  {
    name: "Shares.csv",
    content:
      `Date,ShareCommentary,ShareLink,Visibility\n` +
      `2024-05-10,"Just shipped a new Astro plugin!",https://example.com/post,PUBLIC\n` +
      `2024-03-02,"Thoughts on TypeScript 5.5 — really like the inferred predicates.",,PUBLIC\n`,
  },
  {
    name: "Articles/my-first-article.html",
    content:
      `<html><head><title>Why I love Astro</title><meta property="article:published_time" content="2024-01-15"/></head>` +
      `<body><h1>Why I love Astro</h1><p>Astro is a fantastic <strong>static site</strong> generator.</p>` +
      `<ul><li>Fast</li><li>Simple</li></ul></body></html>`,
  },
];

const buf = makeZip(files);
await writeFile(new URL("./fixture.zip", import.meta.url), buf);
console.log(`wrote test/fixture.zip (${buf.length} bytes, ${files.length} files)`);
