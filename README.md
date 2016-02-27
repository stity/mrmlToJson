# mrmlToJson
tool to extract a json structure file from a MRML 3DSlicer scene

How to use this tool :
* add this repository as a submodule of your atlas repository using `git submodule add https://github.com/stity/mrmlToJson.git <path-to-submodule>`
* copy the file `configMrmlToJson.js` to the parent directory of the submodule (this allows you to commit changes to the config)
* run `npm install` in the submodule directory
* run `node mrmlToJson.js`