//all the path given relatively to mrmlToJson.js script
module.exports = {
    mrmlFileLocation : "",
    colorTableFileLocation : "",
    vtkFilesDirectory : "",
    jsonResultFileName : "atlasStructure.json",
    filesDisplayName : {},
    header : {
        "@type": "Header",
        "species": "human",
        "organ": "",
        "name" : "",
        "license" : "?",
        "citation" : "?",
        "version" : "1",
        "contact" : "",
        "comment" : "",
        "coordinateSystem" : "self defined",
        "root" : []
    },
    labelMapFiles : [{ // can be a list of objects or just a name (if there is only one labelmap)
        name : "",
        includes : [] // a list of label exception [1,23,854, ...] or just "*" which mean that this the default file to look in which means that there can only be only one file with "*" as includes value
    }],
    "backgroundImages" : "" //can be a name or a list of names

};
