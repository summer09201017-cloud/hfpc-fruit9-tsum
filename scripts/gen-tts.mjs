// 烤曉臻(zh-TW-HsiaoChenNeural)語音三句 → voice/*.mp3(逐句落盤,重跑到「新產 0」即完成)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require2 = createRequire('C:/Users/HFP/Downloads/hfpc-git/hfpc-paul-game/node_modules/');
const { MsEdgeTTS, OUTPUT_FORMAT } = require2('msedge-tts');

const OUT = path.resolve(import.meta.dirname, '..', 'voice');
fs.mkdirSync(OUT, { recursive: true });
const LINES = [
  ['intro', '聖靈所結的果子,就是仁愛、喜樂、和平、忍耐、恩慈、良善、信實、溫柔、節制。'],
  ['bless', '果子是聖靈結的——分出去,越分越有!'],
  ['win', '你們多結果子,我父就因此得榮耀,你們也就是我的門徒了。約翰福音十五章八節。']
];
let made = 0;
for (const [name, text] of LINES) {
  const file = path.join(OUT, name + '.mp3');
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) continue;
  const tts = new MsEdgeTTS();
  await tts.setMetadata('zh-TW-HsiaoChenNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text);
  const chunks = [];
  await new Promise((res, rej) => {
    audioStream.on('data', c => chunks.push(c));
    audioStream.on('end', res);
    audioStream.on('error', rej);
  });
  fs.writeFileSync(file, Buffer.concat(chunks));
  made++;
  console.log('baked', name, fs.statSync(file).size, 'bytes');
}
console.log('done, 新產', made);
process.exit(0);
