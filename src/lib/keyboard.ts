/**
 * Layout of the 3D hero keyboard (a 60%-style board, 15 units wide, 5 rows) and the mapping from
 * characters to the keys that type them. Codes match `KeyboardEvent.code`, so a visitor's real
 * key presses light up the matching 3D key.
 */
export type KeyKind = 'alpha' | 'mod' | 'accent' | 'space';
export interface KeyDef {
  code: string;
  label: string;
  /** width in key units */
  w: number;
  /** centre, in key units, relative to the board centre */
  x: number;
  z: number;
  kind: KeyKind;
  /** character typed without / with shift */
  ch?: string;
  sh?: string;
}

type Raw = [code: string, label: string, w?: number, ch?: string, sh?: string, kind?: KeyKind];
const L = (c: string): Raw => [`Key${c}`, c, 1, c.toLowerCase(), c];

const ROWS: Raw[][] = [
  [
    ['Escape', 'esc', 1, undefined, undefined, 'accent'],
    ['Digit1', '1', 1, '1', '!'], ['Digit2', '2', 1, '2', '@'], ['Digit3', '3', 1, '3', '#'], ['Digit4', '4', 1, '4', '$'],
    ['Digit5', '5', 1, '5', '%'], ['Digit6', '6', 1, '6', '^'], ['Digit7', '7', 1, '7', '&'], ['Digit8', '8', 1, '8', '*'],
    ['Digit9', '9', 1, '9', '('], ['Digit0', '0', 1, '0', ')'], ['Minus', '-', 1, '-', '_'], ['Equal', '=', 1, '=', '+'],
    ['Backspace', 'delete', 2, undefined, undefined, 'mod'],
  ],
  [
    ['Tab', 'tab', 1.5, undefined, undefined, 'mod'],
    ...'QWERTYUIOP'.split('').map(L),
    ['BracketLeft', '[', 1, '[', '{'], ['BracketRight', ']', 1, ']', '}'], ['Backslash', '\\', 1.5, '\\', '|', 'mod'],
  ],
  [
    ['CapsLock', 'caps', 1.75, undefined, undefined, 'mod'],
    ...'ASDFGHJKL'.split('').map(L),
    ['Semicolon', ';', 1, ';', ':'], ['Quote', "'", 1, "'", '"'],
    ['Enter', 'return', 2.25, undefined, undefined, 'accent'],
  ],
  [
    ['ShiftLeft', 'shift', 2.25, undefined, undefined, 'mod'],
    ...'ZXCVBNM'.split('').map(L),
    ['Comma', ',', 1, ',', '<'], ['Period', '.', 1, '.', '>'], ['Slash', '/', 1, '/', '?'],
    ['ShiftRight', 'shift', 2.75, undefined, undefined, 'mod'],
  ],
  [
    ['ControlLeft', 'ctrl', 1.25, undefined, undefined, 'mod'], ['AltLeft', 'opt', 1.25, undefined, undefined, 'mod'],
    ['MetaLeft', 'cmd', 1.25, undefined, undefined, 'mod'], ['Space', '', 6.25, ' ', ' ', 'space'],
    ['MetaRight', 'cmd', 1.25, undefined, undefined, 'mod'], ['AltRight', 'opt', 1.25, undefined, undefined, 'mod'],
    ['Fn', 'fn', 1.25, undefined, undefined, 'mod'], ['ControlRight', 'ctrl', 1.25, undefined, undefined, 'mod'],
  ],
];

export const BOARD_W = 15;
export const BOARD_D = ROWS.length;

export const KEYS: KeyDef[] = ROWS.flatMap((row, r) => {
  let x = -BOARD_W / 2;
  return row.map(([code, label, w = 1, ch, sh, kind = 'alpha']) => {
    const k: KeyDef = { code, label, w, x: x + w / 2, z: r - (BOARD_D - 1) / 2, kind, ch, sh };
    x += w;
    return k;
  });
});

export const KEY_BY_CODE = new Map(KEYS.map((k) => [k.code, k]));

const byChar = new Map<string, string[]>();
for (const k of KEYS) {
  if (k.ch !== undefined && !byChar.has(k.ch)) byChar.set(k.ch, [k.code]);
  if (k.sh !== undefined && !byChar.has(k.sh)) byChar.set(k.sh, ['ShiftLeft', k.code]);
}

/** Keys to press for a character (shift + key for capitals and symbols). */
export const keysFor = (ch: string): string[] => byChar.get(ch) ?? [];
