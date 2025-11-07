# imightthrow README

imightthrow is a VSCode extension for TypeScript/JavaScript that shows a configurable decorator next to functions that might throw-- or more specifically, functions that contain the 'throw' keyword.

Link: https://marketplace.visualstudio.com/items?itemName=ChaseBrock.imightthrow [https://marketplace.visualstudio.com/items?itemName=ChaseBrock.imightthrow]

![Example showcase](https://i.postimg.cc/CxQfdN7F/SCR-20251107-bhni.png "Example showcase")

## Requirements

VSCode, TypeScript/JavaScript

## Extension Settings

This extension contributes the following settings:

-   `imightthrow.enable`: Enable/disable this extension.
-   `imightthrow.decoration`: Set the decoration to any string of your choosing.
-   `imightthrow.highlightColor`: Set the color of the decoration.
-   `imightthrow.showOnCalls`: Whether to show the decoration on function calls (default: true).
-   `imightthrow.showOnDeclarations`: Whether to show the decoration on function declarations (default: false).

## Known Issues

Doesn't parse declaration files `(.d.ts)` at the moment, so this plugin doesn't work for functions from external libraries (e.g., those defined in `node_modules`). Maybe I'll add an optional symbol for whether it is unknown that a function might throw.

## Release Notes

### 1.0.0

Initial release!
