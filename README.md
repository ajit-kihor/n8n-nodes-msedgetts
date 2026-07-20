# n8n-nodes-msedgetts

Generate MP3 speech and list voices with Microsoft Edge text-to-speech in self-hosted
[n8n](https://n8n.io/) workflows.

## Features

- Generate MP3 audio from text
- Use popular English and Hindi voices or enter any supported voice identifier
- Adjust speech rate, pitch, and volume
- List the voices currently available from the service
- Return audio through n8n's binary-data manager for use with storage, email, and file nodes
- Process multiple input items while preserving n8n item linking

## Important notice

This is an independent community node. It is not affiliated with, endorsed by, or supported by
Microsoft or n8n. It uses the unofficial Microsoft Edge online TTS service through the
[`msedge-tts`](https://www.npmjs.com/package/msedge-tts) package. The upstream service can change,
rate-limit requests, or become unavailable without notice. Do not rely on it for workloads that
require a Microsoft service-level agreement.

The node bundles its third-party TTS client into the published artifact to avoid installing runtime
dependencies into n8n. It is intended for self-hosted n8n and has not been reviewed or verified by
n8n.

## Requirements

- A current self-hosted n8n installation
- Node.js 22 or newer
- Outbound internet access to the Microsoft Edge TTS service

## Installation

### n8n Community Nodes

1. Open **Settings > Community Nodes** in your self-hosted n8n instance.
2. Select **Install**.
3. Enter `n8n-nodes-msedgetts`.
4. Accept the community-node risk notice and complete the installation.
5. Restart n8n if the node does not appear immediately.

### npm

From the n8n custom-nodes directory, install the package and restart n8n:

```sh
npm install n8n-nodes-msedgetts
```

## Operations

### Generate Speech

Converts the text on every input item into an MP3 file.

| Parameter             | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| Text                  | Text to convert into speech; n8n expressions are supported        |
| Voice                 | One of the included voices or **Custom**                          |
| Custom Voice Name     | Voice identifier returned by **List Voices**                      |
| Adjust Voice Settings | Enables rate, pitch, and volume controls                          |
| Output Binary Field   | Binary property containing the generated MP3; defaults to `audio` |
| File Name             | Name assigned to the MP3; defaults to `audio.mp3`                 |

The input JSON is preserved. Connect the output to nodes such as Google Drive, S3, Email, or Read/Write
Files from Disk and select the configured binary field.

### List Voices

Retrieves the current voice list once and adds the normalized list to `json.voices` on each input
item. Every entry contains:

```json
{
	"name": "en-US-JennyNeural",
	"locale": "en-US",
	"gender": "Female"
}
```

Use a returned `name` value in **Custom Voice Name**.

## Example

1. Add a Manual Trigger.
2. Add **Microsoft Edge TTS**.
3. Select **Generate Speech**.
4. Enter text or an expression such as `{{ $json.message }}`.
5. Select a voice.
6. Execute the workflow.
7. Read the generated MP3 from the `audio` binary property.

## Troubleshooting

### The node is missing after installation

Confirm the package is listed under **Settings > Community Nodes**, then restart n8n and inspect the
n8n startup logs.

### Invalid or unavailable voice

Run **List Voices** and copy the exact `name` value into **Custom Voice Name**. Voice availability is
controlled by the upstream service and may change.

### Requests time out or return no audio

Confirm the n8n host has outbound internet access. Retry with a short text and a known voice such as
`en-US-JennyNeural`. Speech generation is stopped after two minutes if the upstream stream stalls.

### Large text inputs

Split very large documents into smaller items before generating speech. This reduces memory use and
makes retries more reliable.

## Development

```sh
npm ci
npm run format:check
npm run lint
npm test
npm run build
```

Run `npm run dev` to start a local n8n development instance with the node loaded.

## Publishing

Publishing is performed by [`.github/workflows/publish.yml`](.github/workflows/publish.yml) so npm
receives a GitHub provenance statement.

For the first release:

1. Create an npm account with two-factor authentication.
2. Create a granular npm automation token with permission to publish this package.
3. Add it to the GitHub repository as the `NPM_TOKEN` Actions secret.
4. Ensure `package.json` contains the intended version.
5. Commit and push all files.
6. Create and push a matching tag, for example `v1.0.0`.

```sh
git tag v1.0.0
git push origin v1.0.0
```

After the first release, you can configure npm Trusted Publishing for this repository and remove the
long-lived token.

## License

[MIT](LICENSE)
