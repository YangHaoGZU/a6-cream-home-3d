import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const report=JSON.parse(await fs.readFile('public/compression-report.json','utf8'));
const rasters=(await fs.readdir('public',{recursive:true})).filter(f=>/\.(jpg|jpeg|png|webp)$/i.test(f));
assert.equal(rasters.length,report.assets.length);
assert.equal(new Set(report.assets.map(a=>a.path)).size,report.assets.length);
for(const path of rasters){
 const a=report.assets.find(a=>a.path===path);assert.ok(a,path+' lacks TinyPNG record');
 const data=await fs.readFile('public/'+path);assert.equal(data.length,a.outputBytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256);
 assert.equal(a.provider,'TinyPNG');await sharp(data).metadata();
}
const gallery=await fs.readFile('public/gallery/index.html','utf8');
for(const [,path] of gallery.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!/^(https?:|data:)/.test(path)&&!path.includes('${'))await fs.access('public/gallery/'+path);}
for(const [,path] of gallery.matchAll(/"(?:final|reference|thumb)": "([^"]+)"/g))await fs.access('public/gallery/'+path);
console.log('PASS: '+rasters.length+' TinyPNG assets match recorded hashes; gallery references exist.');
