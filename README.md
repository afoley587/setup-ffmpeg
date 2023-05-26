# setup-ffmpeg

Setup FFmpeg in GitHub Actions to use `ffmpeg` and `ffprobe`. The action will download,
cache and add to `PATH` a recent FFmpeg build for the current os.

Only 64-bit Linux, Windows and Mac OS are supported.

## Usage

To use `ffmpeg` and `ffprobe`, run the action before them.

```yml
steps:
  - uses: actions/checkout@v3
  - uses: FedericoCarboni/setup-ffmpeg@v3
    id: setup-ffmpeg
  - run: ffmpeg -i input.avi output.mkv
```

This action also sets a few outputs:

- `path`: Path to the install directory
- `ffmpeg-path`: Path to the ffmpeg executable
- `ffprobe-path`: Path to the ffprobe executable

## FFmpeg Version

The action uses a recent FFmpeg build provided by the following sources:

- Linux Builds - https://johnvansickle.com/ffmpeg/
- Windows Builds - https://www.gyan.dev/ffmpeg/builds/
- MacOS Builds - https://evermeet.cx/ffmpeg/
