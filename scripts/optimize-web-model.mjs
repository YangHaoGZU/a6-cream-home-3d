import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup, meshopt, prune} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const input=process.argv[2];
if (!input) throw new Error('Usage: node scripts/optimize-web-model.mjs source.glb');
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(input);
// This export has no texture images. UVs are unused and need not travel to the browser.
if (doc.getRoot().listTextures().length === 0)
  for (const mesh of doc.getRoot().listMeshes())
    for (const primitive of mesh.listPrimitives())
      for (const semantic of primitive.listSemantics())
        if (semantic.startsWith('TEXCOORD_')) primitive.setAttribute(semantic, null);
// Keep all triangles and semantic categories. 16-bit positions preserve millimetre-scale room detail.
await doc.transform(prune(),dedup(),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeNormal:12}));
const output='public/models/a6-modern-v3.glb';
await io.write(output,doc);
console.log('Optimized model bytes:',(await fs.stat(output)).size);

await fs.writeFile(output+".gz",gzipSync(await fs.readFile(output),{level:9}));
