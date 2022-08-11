import fetch from "node-fetch";
import { open } from "yauzl";
import { createWriteStream, promises as fs } from "fs";
import { dirname, resolve } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const streamPipeline = promisify(pipeline);
const unzip = promisify(open);

const URL_RELEASE_LATEST = "https://api.github.com/repos/Kampfkarren/selene/releases/latest";
const FILENAME_SELENE_ZIP = "selene.zip";
const FILENAME_SELENE_EXE = "selene.exe";

(async function()
{
	console.log("Downloading Selene...");

	const res = await fetch(URL_RELEASE_LATEST);
	const releases = await res.json();

	let chosenAsset;
	for (const asset of releases.assets)
	{
		if (!asset.name.toLowerCase().includes("windows"))
			continue;

		chosenAsset = asset;
		break;
	}

	const zipRes = await fetch(chosenAsset["browser_download_url"]);
	if (!zipRes.ok)
		throw new Error(`unexpected response ${response.statusText}`);

	const fileStream = createWriteStream(FILENAME_SELENE_ZIP);
	await streamPipeline(zipRes.body, fileStream);

	const zip = await unzip(FILENAME_SELENE_ZIP, { lazyEntries: true });
	zip.readEntry();

	zip.on("entry", entry =>
	{
		if (/\/$/.test(entry.fileName))
			return;

		zip.openReadStream(entry, async (err, readStream) =>
		{
			if (err)
				throw err;

			await streamPipeline(readStream, createWriteStream(FILENAME_SELENE_EXE));
			
			await fs.mkdir(resolve(__dirname, "../.bin/"), { recursive: true });
			await fs.rename(FILENAME_SELENE_EXE, resolve(__dirname, "../.bin/selene.exe"));

			zip.close()
			await fs.unlink(FILENAME_SELENE_ZIP);
		});
	});
})();
