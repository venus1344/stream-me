# Simple OvenMediaEngine setup

This is a minimal OME origin setup for:

- ingest from OBS over RTMP
- playback to your site over WebRTC or LL-HLS
- optional restream from the same OBS feed to YouTube through a controllable ffmpeg API

## Files

- `docker-compose.yml`: OME, player nginx, RTMP relay ingress, and restream control API
- `conf/Server.xml`: minimal OME origin config
- `.env.example`: values you must customize
- `player/index.html`: simple playback page for local browser playback
- `player/settings.html`: admin page for configuring and starting the restream
- `restream/app.py`: restream control API that starts and stops ffmpeg

## Configure

1. Copy `.env.example` to `.env`.
2. Set `OME_HOST` to your public DNS name or public IP.
3. Add your YouTube stream key to `YOUTUBE_STREAM_KEY` when you are ready to restream there, or enter it later on the settings page.
4. Make sure these ports are open on the VPS firewall and cloud security group:
   - `1935/tcp` for OBS RTMP ingest
   - `1936/tcp` for OBS relay ingest if you use the ffmpeg restream path
   - `3333/tcp` for WebRTC signalling and LL-HLS HTTP
   - `3478/tcp` for WebRTC TCP relay
   - `10000/tcp` and `10000/udp` for the ICE candidate advertised to viewers

## Run

```bash
cd /Users/danielbwere/projects/tools/ome
cp .env.example .env
docker compose up -d
```

## Local test player

Serve the `player` directory from any simple static server, for example:

```bash
cd /Users/danielbwere/Documents/Codex/2026-06-24/st/ome/player
python3 -m http.server 8080
```

Then open `http://localhost:8080` and point the page at your OME host, app, and stream name.

## OBS settings

There are now two ingest options.

### Option 1: direct to OME

- Service: `Custom`
- Server: `rtmp://YOUR_HOST:1935/app`
- Stream key: `key`

That publishes directly to OME as `app/key`.

### Option 2: relay to OME and YouTube with ffmpeg

- Service: `Custom`
- Server: `rtmp://YOUR_HOST:1936/stream`
- Stream key: `input`

That publishes to the relay. The restream API then duplicates the same feed to:

- `rtmp://ome:1935/app/key` for your website playback
- `rtmps://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY` for YouTube, when configured

Use the relay option when you want one OBS stream to feed multiple destinations without using HLS as the handoff.

Note:
- The `alfg/nginx-rtmp` image uses a built-in RTMP app named `stream`.
- The relay path in this project follows that built-in app instead of replacing the image's nginx config.

## Playback URLs

Replace `YOUR_HOST` with `OME_HOST`.

- LL-HLS playlist:
  - `http://YOUR_HOST:3333/app/key/llhls.m3u8`

## Restream settings page

Open:

- `http://YOUR_HOST:8081/settings.html`

This page lets an admin:

- edit YouTube ffmpeg parameters
- save restream settings
- start the restream process
- stop the restream process
- inspect recent ffmpeg logs

## Notes

- This is intentionally minimal. It does not add TLS certificates, auth, ABR transcoding, or recording.
- If viewers are on the public internet, `OME_HOST` must resolve publicly and match the address OME advertises in `IceCandidates`.
- The relay path does not use HLS. It takes RTMP in from OBS and republishes RTMP out to OME and YouTube.
- The YouTube branch is meant to be re-encoded from the settings page so the user can tune ffmpeg output for YouTube ingest.
- For production browser playback, add TLS and use HTTPS/WSS.
