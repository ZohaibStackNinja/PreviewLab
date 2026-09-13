"""Generate simple valid PNG test images (no external deps)."""
import struct
import sys
import zlib


def png(path, w, h, base):
    rows = b''
    for y in range(h):
        row = b'\x00'
        for x in range(w):
            t = x / w
            r = int(base[0] * (1 - t) + 40 * t)
            g = int(base[1] * (1 - t * 0.5))
            b = int(base[2] * (1 - t * 0.3))
            if (x + y) // 60 % 3 == 0:
                r, g, b = min(255, r + 30), min(255, g + 20), min(255, b + 20)
            row += bytes((r, g, b))
        rows += row

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    body = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(body)


if __name__ == '__main__':
    out = sys.argv[1]
    w = int(sys.argv[2]) if len(sys.argv) > 3 else 1200
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 675
    base = (int(sys.argv[4]) if len(sys.argv) > 4 else 10,
            int(sys.argv[5]) if len(sys.argv) > 5 else 186,
            int(sys.argv[6]) if len(sys.argv) > 6 else 181)
    png(out, w, h, base)
    print(f'wrote {out}')
