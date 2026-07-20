import { dirname, resolve } from 'node:path';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';

import { build } from 'esbuild';

const entryPoint = resolve('dist/nodes/MsEdgeTts/MsEdgeTts.node.js');
const source = await readFile(entryPoint, 'utf8');

await rm(entryPoint, { force: true });
await rm(`${entryPoint}.map`, { force: true });

const result = await build({
	allowOverwrite: true,
	stdin: {
		contents: source,
		loader: 'js',
		resolveDir: dirname(entryPoint),
		sourcefile: 'MsEdgeTts.node.js',
	},
	bundle: true,
	external: ['n8n-workflow'],
	format: 'cjs',
	legalComments: 'eof',
	metafile: true,
	outfile: entryPoint,
	platform: 'node',
	sourcemap: true,
	target: 'node22',
	treeShaking: true,
});

const allowedExternals = new Set([
	...builtinModules,
	...builtinModules.map((moduleName) => `node:${moduleName}`),
	'n8n-workflow',
	'bufferutil',
	'utf-8-validate',
]);
const unexpectedExternals = Object.values(result.metafile.outputs)
	.flatMap((output) => output.imports)
	.filter((dependency) => dependency.external && !allowedExternals.has(dependency.path));

if (unexpectedExternals.length > 0) {
	throw new Error(
		`Bundle contains unexpected external imports: ${unexpectedExternals
			.map((dependency) => dependency.path)
			.join(', ')}`,
	);
}

const packageRoots = new Set();

for (const inputPath of Object.keys(result.metafile.inputs)) {
	const pathParts = inputPath.split(/[\\/]/);
	const nodeModulesIndex = pathParts.lastIndexOf('node_modules');
	if (nodeModulesIndex < 0) continue;

	const packageName = pathParts[nodeModulesIndex + 1];
	const packagePartCount = packageName.startsWith('@') ? 2 : 1;
	packageRoots.add(resolve(...pathParts.slice(0, nodeModulesIndex + 1 + packagePartCount)));
}

const licenseSections = [];

for (const packageRoot of [...packageRoots].sort()) {
	const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
	const packageFiles = await readdir(packageRoot);
	const licenseFile = packageFiles.find((fileName) => /^(license|licence)(\..*)?$/i.test(fileName));
	const licenseText = licenseFile
		? await readFile(resolve(packageRoot, licenseFile), 'utf8')
		: `License identifier: ${packageJson.license ?? 'Unknown'}`;

	licenseSections.push(
		`================================================================================\n` +
			`${packageJson.name}@${packageJson.version}\n` +
			`License: ${packageJson.license ?? 'Unknown'}\n` +
			`================================================================================\n\n` +
			licenseText.trim(),
	);
}

await writeFile(
	resolve('dist/THIRD_PARTY_LICENSES.txt'),
	`Third-party software bundled by n8n-nodes-msedgetts\n\n${licenseSections.join('\n\n')}\n`,
);

await Promise.all(
	['speech.d.ts', 'speech.js', 'speech.js.map', 'voices.d.ts', 'voices.js', 'voices.js.map'].map(
		(fileName) => rm(resolve('dist/nodes/MsEdgeTts', fileName), { force: true }),
	),
);

await rm(resolve('dist/tsconfig.tsbuildinfo'), { force: true });
await rm(resolve('dist/coverage'), { force: true, recursive: true });
