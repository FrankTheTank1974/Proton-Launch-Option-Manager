import { ZstdInit } from '@oneidentity/zstd-js';

export interface TarFileEntry {
  filename: string;
  content: string | Uint8Array;
  mode?: number; // e.g. 0o755 for executable, 0o644 for standard files
  mtime?: number;
}

/**
 * Encodes text into a UTF-8 Uint8Array
 */
function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Formats a number as an octal string padded with leading zeroes and a trailing NUL or space.
 */
function toOctal(val: number, length: number): string {
  const octStr = val.toString(8);
  if (octStr.length >= length) {
    return octStr.slice(octStr.length - length + 1) + '\0';
  }
  return octStr.padStart(length - 1, '0') + '\0';
}

/**
 * Creates a standard POSIX ustar (tar) archive Uint8Array from a list of files.
 * Explicitly marks build.sh and shell scripts with executable (0755 / rwxr-xr-x) permissions.
 */
export function createTarArchive(
  files: TarFileEntry[],
  folderPrefix: string = 'proton_launch_manager'
): Uint8Array {
  const blocks: Uint8Array[] = [];
  const now = Math.floor(Date.now() / 1000);

  // If a folder prefix is provided, create the top-level directory entry first
  if (folderPrefix) {
    const dirHeader = new Uint8Array(512);
    const cleanDirName = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
    const dirNameBytes = encodeUtf8(cleanDirName);

    // Name (0..99)
    dirHeader.set(dirNameBytes.subarray(0, 100), 0);
    // Mode (0755 for directory: rwxr-xr-x)
    dirHeader.set(encodeUtf8(toOctal(0o755, 8)), 100);
    // UID (1000)
    dirHeader.set(encodeUtf8(toOctal(1000, 8)), 108);
    // GID (1000)
    dirHeader.set(encodeUtf8(toOctal(1000, 8)), 116);
    // Size (0 for directory)
    dirHeader.set(encodeUtf8(toOctal(0, 12)), 124);
    // Mtime
    dirHeader.set(encodeUtf8(toOctal(now, 12)), 136);
    // Checksum placeholder (8 spaces)
    for (let i = 148; i < 156; i++) dirHeader[i] = 0x20;
    // Typeflag ('5' = directory)
    dirHeader[156] = '5'.charCodeAt(0);
    // Magic: ustar\0
    dirHeader.set(encodeUtf8('ustar\0'), 257);
    // Version: 00
    dirHeader.set(encodeUtf8('00'), 263);
    // Uname / Gname
    dirHeader.set(encodeUtf8('user\0'), 265);
    dirHeader.set(encodeUtf8('user\0'), 297);

    // Calculate checksum
    let chksum = 0;
    for (let i = 0; i < 512; i++) chksum += dirHeader[i];
    const chksumStr = chksum.toString(8).padStart(6, '0') + '\0 ';
    dirHeader.set(encodeUtf8(chksumStr), 148);

    blocks.push(dirHeader);
  }

  for (const file of files) {
    const fileData = typeof file.content === 'string' ? encodeUtf8(file.content) : file.content;
    const filePath = folderPrefix
      ? `${folderPrefix.replace(/\/$/, '')}/${file.filename}`
      : file.filename;

    // Explicitly check for executable scripts (build.sh, launch_game.sh, etc.)
    const isExecutable =
      file.filename === 'build.sh' ||
      file.filename === 'launch_game.sh' ||
      file.filename.endsWith('.sh') ||
      file.mode === 0o755;

    // 0755 (rwxr-xr-x) for executable scripts, 0644 (rw-r--r--) for regular files
    const fileMode = file.mode ?? (isExecutable ? 0o755 : 0o644);
    const mtime = file.mtime ?? now;

    const header = new Uint8Array(512);
    const pathBytes = encodeUtf8(filePath);

    // Name (0..99)
    if (pathBytes.length <= 100) {
      header.set(pathBytes, 0);
    } else {
      const splitIdx = filePath.lastIndexOf('/', 155);
      if (splitIdx !== -1) {
        const prefix = filePath.substring(0, splitIdx);
        const name = filePath.substring(splitIdx + 1);
        header.set(encodeUtf8(name).subarray(0, 100), 0);
        header.set(encodeUtf8(prefix).subarray(0, 155), 345);
      } else {
        header.set(pathBytes.subarray(0, 100), 0);
      }
    }

    // Mode (0755 for executable scripts like build.sh)
    header.set(encodeUtf8(toOctal(fileMode, 8)), 100);
    // UID
    header.set(encodeUtf8(toOctal(1000, 8)), 108);
    // GID
    header.set(encodeUtf8(toOctal(1000, 8)), 116);
    // Size
    header.set(encodeUtf8(toOctal(fileData.length, 12)), 124);
    // Mtime
    header.set(encodeUtf8(toOctal(mtime, 12)), 136);
    // Checksum placeholder (8 spaces)
    for (let i = 148; i < 156; i++) header[i] = 0x20;
    // Typeflag ('0' = normal file)
    header[156] = '0'.charCodeAt(0);
    // Magic: ustar\0
    header.set(encodeUtf8('ustar\0'), 257);
    // Version: 00
    header.set(encodeUtf8('00'), 263);
    // Uname / Gname
    dirHeaderUname(header);

    // Compute checksum
    let chksum = 0;
    for (let i = 0; i < 512; i++) chksum += header[i];
    const chksumStr = chksum.toString(8).padStart(6, '0') + '\0 ';
    header.set(encodeUtf8(chksumStr), 148);

    blocks.push(header);

    // File Data Block (padded to 512 bytes)
    const paddedSize = Math.ceil(fileData.length / 512) * 512;
    const dataBlock = new Uint8Array(paddedSize);
    dataBlock.set(fileData, 0);
    blocks.push(dataBlock);
  }

  // End of archive marker (two 512-byte zero blocks = 1024 bytes)
  blocks.push(new Uint8Array(1024));

  // Combine all blocks into a single Uint8Array
  const totalLength = blocks.reduce((acc, b) => acc + b.length, 0);
  const tarUint8 = new Uint8Array(totalLength);
  let offset = 0;
  for (const block of blocks) {
    tarUint8.set(block, offset);
    offset += block.length;
  }

  return tarUint8;
}

function dirHeaderUname(header: Uint8Array) {
  const u = encodeUtf8('user\0');
  header.set(u, 265);
  header.set(u, 297);
}

let zstdCodecPromise: Promise<any> | null = null;

async function getZstdCodec() {
  if (!zstdCodecPromise) {
    zstdCodecPromise = ZstdInit();
  }
  return zstdCodecPromise;
}

/**
 * Compresses a list of files into a .tar.zst (Tar + Zstandard) Blob and initiates download.
 * Sets executable permission (0755 / rwxr-xr-x) for build.sh and shell scripts.
 */
export async function downloadTarZstdProject(
  files: TarFileEntry[],
  archiveName: string = 'proton_launch_manager_c_source.tar.zst',
  folderPrefix: string = 'proton_launch_manager'
): Promise<void> {
  // 1. Generate POSIX Tar byte stream with executable permissions (0755) on build.sh and scripts
  const tarBytes = createTarArchive(files, folderPrefix);

  // 2. Compress using Zstandard (zstd)
  const { ZstdSimple } = await getZstdCodec();
  const compressedBytes = ZstdSimple.compress(tarBytes, 9);

  // 3. Create Blob and trigger browser download
  const blob = new Blob([compressedBytes], { type: 'application/zstd' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = archiveName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
